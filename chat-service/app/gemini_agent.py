import json
import logging
from typing import Any
from uuid import UUID

from google import genai
from google.genai import types

from app.catalog_client import catalog_client
from app.category_cache import category_cache
from app.config import settings

log = logging.getLogger(__name__)


_SEARCH_PRODUCTS_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="search_products",
            description=(
                "Search the marketplace catalog. Returns products matching the filters. "
                "Call this tool multiple times in parallel when the user's intent spans different "
                "categories (e.g. a wedding needs wines AND formal wear AND gifts — issue one call per category)."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "name": types.Schema(
                        type="STRING",
                        description="Free-text substring match on product name. Use sparingly; prefer category filtering.",
                    ),
                    "categoryId": types.Schema(
                        type="INTEGER",
                        description="Category ID. Filtering is recursive — passing a parent ID searches all children.",
                    ),
                    "minPrice": types.Schema(type="NUMBER", description="Min price in EUR (optional)."),
                    "maxPrice": types.Schema(type="NUMBER", description="Max price in EUR (optional)."),
                    "minRating": types.Schema(type="NUMBER", description="Min average rating 0-5 (optional)."),
                    "limit": types.Schema(type="INTEGER", description="Max results, 1-20. Default 10."),
                },
            ),
        )
    ]
)


def _build_system_prompt() -> str:
    return f"""You are a shopping assistant for an online marketplace. Your job is to take a buyer's request
(which can be vague, e.g. "I have a wedding coming up") and find relevant products by calling
the `search_products` tool one or more times.

Guidelines:
- Decompose the user's intent into the relevant product categories. Issue parallel `search_products`
  calls — one per category — within the same response.
- Pick categoryId values from the category list below. Prefer narrower (deeper) categories.
  Passing a parent category searches all its children recursively.
- Use price/rating filters only if the user mentioned them.
- After receiving search results, do NOT call the tool again unless results were empty or off-target.
  Stop after at most 2 rounds of tool calls.
- When done, reply ONLY with a JSON object (no prose around it, no markdown fence):
  {{"message": "<short helpful reply in the user's language>", "productIds": ["<uuid>", ...]}}
  - `message`: 1-3 sentences, suggest how the products fit the user's need.
  - `productIds`: 4-10 UUIDs taken VERBATIM from the search results. Never invent IDs.
- If nothing relevant was found, return an empty productIds array and explain in `message`.

CATEGORIES (id, full path):
{category_cache.formatted_tree}
"""


class GeminiAgent:
    def __init__(self) -> None:
        self._client: genai.Client | None = None

    @property
    def client(self) -> genai.Client:
        if self._client is None:
            if not settings.gemini_api_key:
                raise RuntimeError("GEMINI_API_KEY not configured")
            self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    async def chat(
        self, history: list[types.Content], user_message: str
    ) -> tuple[str, list[UUID], dict[UUID, dict[str, Any]]]:
        contents: list[types.Content] = list(history)
        contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

        config = types.GenerateContentConfig(
            system_instruction=_build_system_prompt(),
            tools=[_SEARCH_PRODUCTS_TOOL],
            temperature=settings.gemini_temperature,
            max_output_tokens=1024,
        )

        seen_products: dict[UUID, dict[str, Any]] = {}

        for _ in range(settings.gemini_max_iterations):
            response = await self.client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=contents,
                config=config,
            )

            candidate = response.candidates[0] if response.candidates else None
            parts = candidate.content.parts if candidate and candidate.content else []
            if not parts:
                raise RuntimeError("Empty LLM response")

            function_calls = [p.function_call for p in parts if p.function_call]
            text_parts = [p.text for p in parts if p.text]

            if function_calls:
                contents.append(types.Content(role="model", parts=parts))
                tool_response_parts: list[types.Part] = []
                for call in function_calls:
                    result = await self._execute_tool(call.name, dict(call.args or {}), seen_products)
                    tool_response_parts.append(
                        types.Part.from_function_response(name=call.name, response=result)
                    )
                contents.append(types.Content(role="user", parts=tool_response_parts))
                continue

            text = "".join(text_parts)
            message, product_ids = _parse_final(text)
            return message, product_ids, seen_products

        log.warning("Reached max iterations without final answer")
        fallback_ids = list(seen_products.keys())[:8]
        return (
            "Sorry, I couldn't finish searching. Please try rephrasing your request.",
            fallback_ids,
            seen_products,
        )

    async def _execute_tool(
        self, name: str, args: dict[str, Any], seen_products: dict[UUID, dict[str, Any]]
    ) -> dict[str, Any]:
        if name != "search_products":
            return {"error": f"unknown tool: {name}"}
        try:
            page = await catalog_client.search_products(
                name=args.get("name"),
                category_id=args.get("categoryId"),
                min_price=args.get("minPrice"),
                max_price=args.get("maxPrice"),
                min_rating=args.get("minRating"),
                limit=int(args.get("limit") or 10),
            )
            compact = []
            for p in page.get("content", []):
                pid = UUID(p["id"])
                if pid not in seen_products:
                    seen_products[pid] = p
                compact.append(
                    {
                        "id": p["id"],
                        "name": p.get("name"),
                        "price": p.get("price"),
                        "rating": p.get("averageRating"),
                        "categoryId": p.get("categoryId"),
                    }
                )
            return {"products": compact, "totalMatches": page.get("totalElements", len(compact))}
        except Exception as ex:
            log.warning("search_products failed: %s", ex)
            return {"error": str(ex)}


def _parse_final(text: str) -> tuple[str, list[UUID]]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        nl = cleaned.find("\n")
        if nl > 0:
            cleaned = cleaned[nl + 1 :]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
    try:
        obj = json.loads(cleaned)
        message = str(obj.get("message", "")).strip()
        ids: list[UUID] = []
        for raw in obj.get("productIds", []) or []:
            try:
                ids.append(UUID(str(raw)))
            except (ValueError, TypeError):
                continue
        return message, ids
    except json.JSONDecodeError:
        return text.strip(), []


gemini_agent = GeminiAgent()
