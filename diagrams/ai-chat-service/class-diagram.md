# AI / Chat Service — Module Diagram

The chat service is a Python / FastAPI application. It delegates product
lookup to the catalog service via REST and uses an external LLM's
tool-calling feature to drive the search loop.

```mermaid
classDiagram
    class ChatRouter {
        +list_sessions() List~ChatSessionSummary~
        +create_session() ChatSessionDetail
        +get_session(id) ChatSessionDetail
        +delete_session(id) void
        +send_message(id, body) SendMessageResponse
    }

    class Repository {
        +create_session(userId, title) dict
        +list_sessions(userId) list
        +get_session(id, userId) dict
        +delete_session(id, userId) bool
        +append_messages(id, userId, user, assistant, productIds, productNames, searchParams, newTitle) void
        +history_to_openai_messages(messages) list
    }

    class LlmAgent {
        -AsyncOpenAI client
        +chat(history, userMessage) tuple[message, productIds, seenProducts, isFallback, searches]
        -_execute_tool(name, args, seenOrder, seenProducts) dict
    }

    class CategoryCache {
        -str formatted_tree
        -dict lookup
        -list all_paths
        +resolve(query) int|None
        +suggest(query, n) list~str~
        +refresh() bool
        +start_refresh_loop() void
    }

    class CatalogClient {
        -AsyncClient httpClient
        +get_category_tree() list
        +search_products(name, categoryId, minPrice, maxPrice, minRating, sortBy, sortDirection, limit) dict
    }

    class ChatSession {
        <<MongoDB document>>
        +ObjectId _id
        +String userId
        +String title
        +List~ChatMessage~ messages
        +DateTime createdAt
        +DateTime updatedAt
    }

    class ChatMessage {
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

    ChatRouter --> Repository
    ChatRouter --> LlmAgent
    LlmAgent --> CatalogClient : product search
    LlmAgent --> CategoryCache : categoryPath → id
    LlmAgent ..> SearchProductsTool : exposes to LLM
    CategoryCache --> CatalogClient : periodic refresh
    Repository ..> ChatSession : stored as
    ChatSession "1" --> "0..*" ChatMessage
```

## Notes

- **Search via catalog REST.** Product retrieval is delegated to the catalog
  service's existing search endpoint.
- **LLM tool calling.** The LLM is given a `search_products` tool and chooses
  when to call it, with what parameters, and how many parallel calls to issue
  (one per category for multi-intent queries).
- **Three parallel catalog calls per tool invocation.** For every
  `search_products` tool call the LLM makes, the service fans out into three
  server-side calls — `(name + category + filters)`, `(category + filters, no
  name)`, `(name only)` — to widen the candidate pool before the LLM ranks.
- **Categories cached in-process.** `CategoryCache` pulls the tree from the
  catalog service on startup and refreshes every 30 minutes; it resolves the
  `categoryPath` the LLM passes (as a string) to an internal integer
  `categoryId`, with `difflib` fuzzy-match fallback for near misses.
- **LLM-as-reranker.** The final LLM turn returns a JSON object of
  `{id, score}` pairs; the service filters by score threshold and returns the
  top N to the client.
- **Conversational memory.** Prior `searchParams` and `productNames` are
  surfaced to the LLM as bracketed hints on each assistant message, so the
  model can TUNE previous searches (adjusting price, sort, category) or
  REPLACE them when the user pivots.
