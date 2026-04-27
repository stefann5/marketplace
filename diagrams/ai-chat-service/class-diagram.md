# AI / Chat Service — Module Diagram

The chat service is a Python / FastAPI application. It delegates product
lookup to the catalog service via REST and uses an external LLM's
tool-calling feature to drive the search loop.

```mermaid
classDiagram
    class ChatRouter {
        +list_sessions(user_id) list~ChatSessionSummary~
        +create_session(user_id) ChatSessionDetail
        +get_session(session_id, user_id) ChatSessionDetail
        +delete_session(session_id, user_id) void
        +send_message(session_id, body, user_id) SendMessageResponse
    }

    class RepositoryModule {
        <<module>>
        +create_session(user_id, title) dict
        +list_sessions(user_id, limit) list
        +get_session(session_id, user_id) dict | None
        +delete_session(session_id, user_id) bool
        +append_messages(session_id, user_id, user_message, assistant_message, product_ids, product_names, search_params, new_title) void
        +history_to_openai_messages(messages) list
    }

    class LlmAgent {
        -AsyncOpenAI _client
        +chat(history, user_message) tuple
        -_execute_tool(name, args, seen_order, seen_products) dict
    }

    class CategoryCache {
        -str _formatted
        -dict _lookup
        -dict _display_by_normalized
        -list _all_paths
        +formatted_tree str
        +resolve(query) int | None
        +suggest(query, n) list~str~
        +all_paths list~str~
        +refresh() bool
        +start_refresh_loop() void
        +stop() void
    }

    class CatalogClient {
        -AsyncClient _client
        +aclose() void
        +get_category_tree() list
        +search_products(name, category_id, min_price, max_price, min_rating, sort_by, sort_direction, limit) dict
    }

    class ChatSessionDoc {
        <<MongoDB document>>
        +ObjectId _id
        +String userId
        +String title
        +List~ChatMessageEntry~ messages
        +DateTime createdAt
        +DateTime updatedAt
    }

    class ChatMessageEntry {
        <<embedded document>>
        +String role  (user | assistant)
        +String content
        +List~String~ productIds
        +List~String~ productNames
        +List~dict~ searchParams
        +DateTime createdAt
    }

    class SearchProductsTool {
        <<OpenAI tool schema>>
        +name: search_products
        +params: name, categoryPath, minPrice, maxPrice, minRating, sortBy, sortDirection, limit
    }

    ChatRouter --> RepositoryModule
    ChatRouter --> LlmAgent
    LlmAgent --> CatalogClient : product search
    LlmAgent --> CategoryCache : categoryPath to id
    LlmAgent ..> SearchProductsTool : exposes to LLM
    CategoryCache --> CatalogClient : periodic refresh
    RepositoryModule ..> ChatSessionDoc : stored as
    ChatSessionDoc "1" --> "0..*" ChatMessageEntry
```

## Notes

- **Search via catalog REST.** Product retrieval is delegated to the catalog
  service's existing search endpoint (`GET /api/categories` + `GET /api/products`).
- **LLM tool calling.** The LLM is given a `search_products` tool and chooses
  when to call it, with what parameters, and how many parallel calls to issue
  (one per category for multi-intent queries). On the first iteration
  `tool_choice="required"` forces the model to search before answering.
- **Three catalog calls per tool invocation.** For every `search_products`
  tool call the LLM makes, the service fans out into three catalog calls —
  `(name + category + filters)`, `(category + filters, no name)`, and
  `(name only)` — to widen the candidate pool before the LLM ranks.
- **Categories cached in-process.** `CategoryCache` pulls the tree from the
  catalog service on startup and refreshes periodically (configurable); it
  resolves the `categoryPath` the LLM passes (as a string) to an internal
  integer `categoryId`, with `difflib` fuzzy-match fallback for near misses.
- **LLM-as-reranker.** The final LLM turn returns a JSON object with a
  `_reasoning` field, a `message` field, and a `products` array of
  `{id, score}` pairs; the service filters by score threshold and returns the
  top N to the client.
- **Conversational memory.** Prior `searchParams` and `productNames` are
  appended to each stored assistant message as bracketed hints (via
  `history_to_openai_messages`), so the model can TUNE previous searches
  (adjusting price, sort, category) or REPLACE them when the user pivots.
- **Fallback responses.** If the LLM reaches `llm_max_iterations` without a
  final answer, or returns invalid JSON, the service returns a random
  user-friendly fallback message.
