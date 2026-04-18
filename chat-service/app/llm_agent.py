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


_NO_PRODUCTS_RESPONSES = [
    "I couldn't find anything in the catalog that matches what you're after. Try different wording or a related item?",
    "Nothing in our catalog really fits that request. Want to try rephrasing or broadening it a bit?",
    "I came up empty on that one — we don't seem to carry a good match. Mind trying a different angle?",
    "No solid matches in the catalog for that. Could you try different keywords or a related product?",
    "I looked but couldn't find anything that fits. Try rewording — sometimes a slightly different term turns up more.",
]


_SEARCH_PRODUCTS_TOOL = {
    "type": "function",
    "function": {
        "name": "search_products",
        "description": (
            "Search the marketplace catalog. Returns products matching the filters. "
            "Call this tool multiple times in parallel when the user's intent spans different "
            "categories (e.g. a wedding needs wines AND formal wear AND gifts — issue one call per category). "
            "Both `name` and `categoryId` are required on every call."
        ),
        "strict": True,
        "parameters": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Free-text substring match on product name. REQUIRED. Use a single concrete keyword from the user's request (e.g. 'laptop', 'shirt', 'hdmi').",
                },
                "categoryPath": {
                    "type": "string",
                    "description": "Category to search in. REQUIRED. Use either the leaf name ('Rings') or the full path ('Jewellery & Watches > Rings') exactly as it appears in the CATEGORIES list. Filtering is recursive — a parent path searches all children. The server resolves this to an internal ID.",
                },
                "minPrice": {"type": ["number", "null"], "description": "Min price in USD. Pass null when not constrained."},
                "maxPrice": {"type": ["number", "null"], "description": "Max price in USD. Pass null when not constrained."},
                "minRating": {"type": ["number", "null"], "description": "Min average rating 0-5. Pass null when not constrained."},
                "sortBy": {
                    "type": ["string", "null"],
                    "enum": ["price", "rating", "date", None],
                    "description": "Sort field. Default 'rating'. Use 'price' for cheapest/most expensive queries. Pass null for default.",
                },
                "sortDirection": {
                    "type": ["string", "null"],
                    "enum": ["asc", "desc", None],
                    "description": "Sort direction. Default 'desc'. Use 'asc' for cheapest, 'desc' for most expensive. Pass null for default.",
                },
                "limit": {"type": ["integer", "null"], "description": "Max results, 1-20. Pass null for default of 10."},
            },
            "required": [
                "name",
                "categoryPath",
                "minPrice",
                "maxPrice",
                "minRating",
                "sortBy",
                "sortDirection",
                "limit",
            ],
        },
    },
}


def _build_system_prompt() -> str:
    categories = category_cache.formatted_tree or "(category list temporarily unavailable)"
    threshold = settings.chat_score_threshold
    max_products = settings.chat_max_products
    max_iterations = settings.llm_max_iterations
    
    return f"""You are an expert shopping assistant for an online marketplace. Your goal is to find the perfect products for the user by calling the `search_products` tool, filtering the results strictly, and returning a final JSON response.

### 1. SEARCH STRATEGY (TOOL USAGE)
- **Mandatory Search:** You MUST call `search_products` at least once before recommending anything.
- **Required Params:** Every `search_products` call MUST include both `name` (a concrete keyword) AND `categoryPath` (from the CATEGORIES list). Neither can be null. Other filters (`minPrice`, `maxPrice`, `minRating`, `sortBy`, `sortDirection`, `limit`) are required by the schema too — pass `null` when you don't want to constrain them.
- **Decompose Intents:** If the user's request spans multiple categories (e.g. "wedding outfit" → shirts AND shoes AND jewelry), issue PARALLEL `search_products` calls — one per category — all sharing the SAME `name` keyword (or a category-appropriate variant) plus that category's `categoryPath`.
- **Picking the Keyword:** Use the most obvious single noun from the user's request: "hdmi" for "I need an hdmi cable", "laptop" for "help me find a laptop", "shirt" for "formal shirt", "tv" for "I want a tv". Prefer 1 word, max 3. For abstract requests with no concrete product noun (e.g. "I have a wedding coming up"), pick a representative keyword for each parallel call (e.g. `name="shirt"` + clothing category, `name="ring"` + jewelry category, `name="wine"` + wine category).
- **Picking the Category:** Pass the EXACT name or full path as it appears in the CATEGORIES list — copy verbatim, do not abbreviate or invent. Examples: `categoryPath="Rings"` or `categoryPath="Jewellery & Watches > Rings"`. Use the full path when the leaf name might be ambiguous. Prefer deeper/narrower categories. Filtering is recursive — a parent path searches all children.
- **Prices:** Pass `maxPrice` / `minPrice` when the user mentions a budget; otherwise pass null. Re-apply on every subsequent turn unless the user changes them.
- **Iteration Limits:** Stop searching after a maximum of {max_iterations} rounds of tool calls.
- **Memory & Refinement:** Each previous assistant message ends with two bracketed lines:
  `[Searches you ran in this turn: name=laptop categoryPath=Laptops maxPrice=600; ...]`
  shows the exact tool calls you made, and `[Products shown to user in this reply: ...]`
  shows what was returned. Use these to decide between two modes:
    - **TUNE** (default): the user is refining the SAME subject — "cheaper", "in black",
      "actually $300", "show me more", "show me the most expensive one", "ditch the budget",
      "I'm a man" after a clothing query. Re-issue the previous searches with the constraint
      changed (adjust `maxPrice`, drop `maxPrice`, set `sortBy=price` + `sortDirection=desc`
      for "most expensive", swap `name`, narrow `categoryPath`). KEEP the subject keyword
      (e.g. `name="tv"`) and previous category filters — never strip them on a tune. Prefer
      products NOT in the previous list.
    - **REPLACE**: the user pivoted to a NEW subject — "actually I want a tablet not a
      laptop", "show me jewelry instead", "different topic, find me a gift for my mom".
      Drop the old `name`/`categoryPath` entirely and start fresh.
  When uncertain between tune and replace, default to TUNE — most short follow-up messages
  are refinements, not pivots. NEVER call `search_products` with no parameters.

### 2. EVALUATION & SCORING STRICTNESS
Search results are often noisy. You must act as a STRICT filter.
- Score each product from 0 to 100 based on its fit for the CURRENT request.
  - **90-100**: Perfect match. Exactly what was asked for.
  - **70-89**: Strong match. Clearly fits the intent.
  - **50-69**: Borderline. Use only if better options are scarce.
  - **0-49**: Weak / Off-topic (e.g., women's items for a men's query, gym wear for a formal query).
- **Be Nuanced:** Use the full 0-100 range. Avoid rounding everything to 90. If item A is slightly better than item B, score them 94 and 91. 
- **Diversity:** For multi-category requests, balance the top products across categories.

### 3. FINAL RESPONSE FORMAT
When you have finished gathering tool results, you must reply with ONLY a raw JSON object. Do not include markdown formatting (like ```json), and do not include any text outside the JSON.

Your JSON must exactly match this schema:
{{
  "_reasoning": "<Briefly explain your filtering and scoring logic to yourself here. Note which items failed the {threshold} threshold and why.>",
  "message": "<Friendly 1-3 sentence reply explaining to the user how the selected products fit their need. DO NOT mention IDs, prices, or product names, as the UI handles this.>",
  "products":[
    {{"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "score": 95}},
    {{"id": "9f8e7d6c-5b4a-3c2d-1e0f-9a8b7c6d5e4f", "score": 82}}
  ]
}}

### 4. JSON OUTPUT CONSTRAINTS
- **Product IDs are UUIDs.** The `id` field MUST be a UUID string copied VERBATIM from the `id` value of a product returned in the tool results (e.g. "3843e2ac-aa42-5925-a544-7e6a53f2e0ac"). NEVER invent IDs. NEVER use placeholder text like "product1", "item_a", or "1". If you cannot find real UUIDs in the tool results, return an empty `"products": []` array instead of fabricating any.
- **Threshold:** ONLY include products in the `"products"` array with a score >= {threshold}. Drop everything below.
- **Limit:** Return a maximum of {max_products} products, ordered by score descending.
- **Empty State:** If no products meet the threshold, return an empty array (`"products":[]`) and explain the lack of matches in the `"message"`.

### CATEGORIES (one per line — pass the leaf or the full path as `categoryPath`):
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
    ) -> tuple[str, list[UUID], dict[UUID, dict[str, Any]], bool, list[dict[str, Any]]]:
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": _build_system_prompt()},
            *history,
            {"role": "user", "content": user_message},
        ]

        seen_order: list[UUID] = []
        seen_products: dict[UUID, dict[str, Any]] = {}
        searches: list[dict[str, Any]] = []

        for iteration in range(settings.llm_max_iterations):
            is_first = iteration == 0
            kwargs: dict[str, Any] = {
                "model": settings.llm_model,
                "messages": messages,
                "tools": [_SEARCH_PRODUCTS_TOOL],
                "tool_choice": "required" if is_first else "auto",
                "temperature": settings.llm_temperature,
                "max_tokens": 1024,
            }
            if not is_first:
                kwargs["response_format"] = {"type": "json_object"}
            response = await self.client.chat.completions.create(**kwargs)
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
                    if tc.function.name == "search_products":
                        searches.append({k: v for k, v in args.items() if v is not None})
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

            raw = (assistant_msg.content or "").strip()
            message, ranked_ids = _parse_final_response(raw, seen_products)
            if not message:
                message = "Here are some suggestions."
            return message, ranked_ids, seen_products, False, searches

        log.warning("Reached max iterations without final answer")
        return random.choice(_FALLBACK_RESPONSES), [], {}, True, searches

    async def _execute_tool(
        self,
        name: str,
        args: dict[str, Any],
        seen_order: list[UUID],
        seen_products: dict[UUID, dict[str, Any]],
    ) -> dict[str, Any]:
        if name != "search_products":
            return {"error": f"unknown tool: {name}"}
        category_path = args.get("categoryPath")
        category_id = category_cache.resolve(category_path)
        if category_id is None:
            log.warning("Unknown categoryPath: %r", category_path)
            return {
                "error": (
                    f"Unknown categoryPath {category_path!r}. Use one of the exact "
                    "values from the CATEGORIES list (leaf name or full path)."
                ),
                "products": [],
                "totalMatches": 0,
            }
        try:
            page = await catalog_client.search_products(
                name=args.get("name"),
                category_id=category_id,
                min_price=args.get("minPrice"),
                max_price=args.get("maxPrice"),
                min_rating=args.get("minRating"),
                sort_by=args.get("sortBy"),
                sort_direction=args.get("sortDirection"),
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


def _parse_args(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _parse_final_response(
    raw: str, seen_products: dict[UUID, dict[str, Any]]
) -> tuple[str, list[UUID]]:
    if not raw:
        return "", []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        log.warning("LLM final response was not valid JSON: %s", raw[:200])
        return random.choice(_FALLBACK_RESPONSES), []

    message = ""
    reasoning = ""
    items: list[Any] = []
    if isinstance(parsed, dict):
        message = str(parsed.get("message") or "").strip()
        reasoning = str(parsed.get("_reasoning") or "").strip()
        raw_items = parsed.get("products") or []
        if isinstance(raw_items, list):
            items = raw_items
    elif isinstance(parsed, list):
        log.warning("LLM returned a bare list instead of {message, products} object")
        items = parsed
    else:
        return random.choice(_FALLBACK_RESPONSES), []

    if reasoning:
        log.info("LLM reasoning: %s", reasoning)

    threshold = settings.chat_score_threshold
    scored: list[tuple[int, UUID]] = []
    for item in items:
        if not isinstance(item, dict):
            log.warning("Dropping non-dict product item: %r", item)
            continue
        raw_id = item.get("id")
        raw_score = item.get("score")
        if raw_id is None or raw_score is None:
            log.warning("Dropping product with missing id/score: %r", item)
            continue
        try:
            pid = UUID(str(raw_id))
            score = int(raw_score)
        except (ValueError, TypeError) as ex:
            log.warning("Dropping product — invalid id/score (%s): %r", ex, item)
            continue
        # if score < threshold or pid not in seen_products:
        #     continue
        scored.append((score, pid))

    scored.sort(key=lambda t: t[0], reverse=True)
    log.info(
        "LLM ranked %d/%d products above threshold %d: %s",
        len(scored),
        len(items),
        threshold,
        [(seen_products[pid].get("name", str(pid)), score) for score, pid in scored],
    )
    ranked = [pid for _, pid in scored[: settings.chat_max_products]]
    if not ranked:
        return random.choice(_NO_PRODUCTS_RESPONSES), []
    return message, ranked


llm_agent = LlmAgent()
