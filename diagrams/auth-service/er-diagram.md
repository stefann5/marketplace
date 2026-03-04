# Auth Service — ER Diagram

```mermaid
erDiagram
    USER {
        uuid id PK
        string email UK
        string password_hash
        string role
        uuid tenant_id
        timestamp created_at
    }
```
