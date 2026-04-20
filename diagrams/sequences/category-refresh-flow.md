# Sequence Diagram — Category Cache Refresh

The AI/Chat service does not index products — it does not maintain any local
copy of the catalog. Instead, it keeps a lightweight in-memory cache of the
platform's **category tree**, which is used to resolve the `categoryPath`
string the LLM emits into the integer `categoryId` accepted by the catalog
search API.

The cache is refreshed from the catalog service on startup and periodically
thereafter.

```mermaid
sequenceDiagram
    participant AI as AI/Chat Service
    participant CAT as Catalog Service

    Note over AI: on startup / every 30 min

    AI->>CAT: GET /api/categories
    CAT-->>AI: category tree (id, name, children[])

    AI->>AI: walk tree, build lookup maps<br/>(full path → id, leaf name → id,<br/>normalized → display path)

    Note over AI: lookup used by<br/>LlmAgent._execute_tool<br/>to resolve categoryPath → categoryId<br/>before hitting the catalog search API
```
