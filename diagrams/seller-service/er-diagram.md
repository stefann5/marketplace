# Seller Service — ER Diagram

```mermaid
erDiagram
    SELLER_PROFILE {
        uuid id PK
        uuid user_id UK
        string company_name
        text description
        string contact_info
        string logo_url
        string slug UK
        string status
        timestamp created_at
    }

    SELLER_DOCUMENT {
        uuid id PK
        uuid seller_id FK
        string object_key
        timestamp uploaded_at
    }

    SELLER_THEME {
        uuid seller_id PK
        string preset
        string primary_color
        string accent_color
        string font_family
        string border_radius
        string banner_url
        string logo_url
    }

    SELLER_PROFILE ||--|{ SELLER_DOCUMENT : "has"
    SELLER_PROFILE ||--|| SELLER_THEME : "has"
```
