# Order Service — ER Diagram

```mermaid
erDiagram
    CART {
        uuid id PK
        uuid user_id UK
        timestamp updated_at
    }

    CART_ITEM {
        uuid id PK
        uuid cart_id FK
        uuid product_id
        uuid tenant_id
        int quantity
        decimal unit_price
    }

    ORDER {
        uuid id PK
        uuid user_id
        uuid tenant_id
        string status
        decimal total
        timestamp created_at
    }

    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id
        int quantity
        decimal unit_price
    }

    CART ||--|{ CART_ITEM : "contains"
    ORDER ||--|{ ORDER_ITEM : "contains"
```
