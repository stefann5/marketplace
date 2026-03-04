# Catalog Service — ER Diagram

```mermaid
erDiagram
    PRODUCT {
        uuid id PK
        uuid tenant_id
        string name
        text description
        decimal price
        int stock
        int version
        uuid category_id FK
        string image_url
        double average_rating
        int review_count
        timestamp created_at
        timestamp updated_at
    }

    CATEGORY {
        uuid id PK
        string name
        uuid parent_id FK
        int display_order
    }

    REVIEW {
        uuid id PK
        uuid product_id FK
        uuid user_id
        string buyer_name
        int rating
        text comment
        timestamp created_at
        timestamp updated_at
    }

    PRODUCT }o--|| CATEGORY : "belongs to"
    REVIEW }o--|| PRODUCT : "reviews"
    CATEGORY ||--o{ CATEGORY : "parent of"
```
