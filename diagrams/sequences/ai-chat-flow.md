# Sequence Diagram — AI Chat Flow

```mermaid
sequenceDiagram
    actor Buyer
    participant GW as API Gateway
    participant AI as AI/Chat Service
    participant VS as MongoDB Vector Store
    participant LLM as External LLM API

    Buyer->>GW: POST /chat/message { text: "..." }
    GW->>AI: POST /chat (X-User-Id header)

    AI->>AI: generate query embedding (sentence transformer)
    AI->>VS: vector similarity search (top K)
    VS-->>AI: matching ProductEmbeddings

    AI->>AI: build RAG prompt (query + product context)
    AI->>LLM: POST /completions (prompt)
    LLM-->>AI: { productIds[], explanation }

    AI-->>GW: ChatResponse { message, productIds }
    GW-->>Buyer: response + product card data
```
