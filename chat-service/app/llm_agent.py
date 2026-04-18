import json
import logging
import random
from typing import Any
from uuid import UUID

from openai import AsyncOpenAI

from app.catalog_client import catalog_client
from app.category_cache import category_cache
from app.config import settings

log = logging.getLogger(__name__)


_FALLBACK_RESPONSES = [
    "I'm having trouble narrowing down what you're looking for. Could you rephrase your request or add a bit more detail?",
    "I couldn't quite pin down good matches for that. Try rewording your request or being more specific about what you want.",
    "Hmm, that search didn't go anywhere useful. Mind trying different wording or sharing a little more context?",
    "I wasn't able to come up with solid recommendations this time. Could you give it another go with different phrasing?",
    "I got stuck trying to figure out the right products for that. Try rephrasing — a keyword or two about what matters to you helps a lot.",
]


_SEARCH_PRODUCTS_TOOL = {
    "type": "function",
    "function": {
        "name": "search_products",
        "description": (
            "Search the marketplace catalog. Returns products matching the filters. "
            "Call this tool multiple times in parallel when the user's intent spans different "
            "categories (e.g. a wedding needs wines AND formal wear AND gifts — issue one call per category)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": ["string", "null"],
                    "description": "Free-text substring match on product name. Use sparingly; prefer category filtering.",
                },
                "categoryId": {
                    "type": ["integer", "null"],
                    "description": "Category ID. Filtering is recursive — passing a parent ID searches all children.",
                },
                "minPrice": {"type": ["number", "null"], "description": "Min price in EUR (optional)."},
                "maxPrice": {"type": ["number", "null"], "description": "Max price in EUR (optional)."},
                "minRating": {"type": ["number", "null"], "description": "Min average rating 0-5 (optional)."},
                "limit": {"type": ["integer", "null"], "description": "Max results, 1-20. Default 10."},
            },
        },
    },
}


def _build_system_prompt() -> str:
    categories = category_cache.formatted_tree or "(category list temporarily unavailable)"
    return f"""You are a shopping assistant for an online marketplace. Take the buyer's request
(which may be vague, e.g. "I have a wedding coming up") and find relevant products by calling
the `search_products` tool.

How to search:
- You MUST call `search_products` at least once before recommending anything. You have NO
  memory of previous searches across turns — earlier results are gone. If the user refines
  their request ("actually, I'm a guy", "cheaper options", etc.), search again.
- Decompose the user's intent into the relevant product categories. Issue parallel
  `search_products` calls — one per category — within the same response.
- ONLY use categoryId values from the CATEGORIES list below. Prefer narrower (deeper) categories.
  Passing a parent category searches all its children recursively.
- IN ADDITION to category searches, always issue ONE extra `search_products` call using only
  the `name` parameter — no categoryId, no price/rating filters. Use the single most obvious
  keyword from the user's request (e.g. "hdmi" for "I need an hdmi cable", "shirt" for
  "looking for a formal shirt"). Prefer 1 keyword; use at most 3 words only if no single
  word captures the intent. Skip this call only if the user's request is abstract with no
  concrete product word (e.g. "I have a wedding coming up").
- Use price/rating filters only if the user mentioned them.
- Stop after at most {settings.llm_max_iterations} rounds of tool calls.

How to reply:
- After tool results come back, write a short, friendly reply (1-3 sentences) in the user's
  language explaining how the suggested products fit their need. Do NOT list product IDs,
  prices, or names — the UI renders product cards alongside your message.
- Do NOT explain your reasoning or describe what you searched for. Just give the recommendation.
- If every search returned no results, say so honestly — do NOT claim you found products
  when the tool returned nothing.

CATEGORIES (id, full path):
{categories}
"""


class LlmAgent:
    def __init__(self) -> None:
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            if not settings.llm_api_key:
                raise RuntimeError("LLM_API_KEY not configured")
            self._client = AsyncOpenAI(
                api_key=settings.llm_api_key,
                base_url=settings.llm_base_url,
            )
        return self._client

    async def chat(
        self, history: list[dict[str, Any]], user_message: str
    ) -> tuple[str, list[UUID], dict[UUID, dict[str, Any]], bool]:
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": _build_system_prompt()},
            *history,
            {"role": "user", "content": user_message},
        ]

        seen_order: list[UUID] = []
        seen_products: dict[UUID, dict[str, Any]] = {}

        for iteration in range(settings.llm_max_iterations):
            tool_choice = "required" if iteration == 0 else "auto"
            response = await self.client.chat.completions.create(
                model=settings.llm_model,
                messages=messages,
                tools=[_SEARCH_PRODUCTS_TOOL],
                tool_choice=tool_choice,
                temperature=settings.llm_temperature,
                max_tokens=1024,
            )
            choice = response.choices[0]
            assistant_msg = choice.message

            if assistant_msg.tool_calls:
                messages.append(
                    {
                        "role": "assistant",
                        "content": assistant_msg.content or "",
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments,
                                },
                            }
                            for tc in assistant_msg.tool_calls
                        ],
                    }
                )
                for tc in assistant_msg.tool_calls:
                    args = _parse_args(tc.function.arguments)
                    result = await self._execute_tool(
                        tc.function.name, args, seen_order, seen_products
                    )
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": json.dumps(result),
                        }
                    )
                continue

            text = (assistant_msg.content or "").strip() or "Here are some suggestions."
            return text, seen_order, seen_products, False

        log.warning("Reached max iterations without final answer")
        return random.choice(_FALLBACK_RESPONSES), [], {}, True

    async def _execute_tool(
        self,
        name: str,
        args: dict[str, Any],
        seen_order: list[UUID],
        seen_products: dict[UUID, dict[str, Any]],
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
                    seen_order.append(pid)
                compact.append(
                    {
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


def _parse_args(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


llm_agent = LlmAgent()
