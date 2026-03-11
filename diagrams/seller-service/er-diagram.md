# Seller Service — ER Diagram

```mermaid
erDiagram
    SELLER_PROFILE {
        uuid id PK
        uuid user_id UK
        uuid tenant_id
        string company_name
        text description
        string slug UK
        string contact_phone
        string contact_email
        string contact_address
        string logo_url
        string status
        timestamp created_at
        timestamp updated_at
    }

    SELLER_DOCUMENT {
        uuid id PK
        uuid seller_id FK
        string file_name
        string object_key
        string content_type
        timestamp uploaded_at
    }

    SELLER_THEME {
        uuid seller_id PK
        string preset
        string primary_color
        string font_family
        string border_radius
        string banner_url
        string logo_url
    }

    SELLER_PROFILE ||--|{ SELLER_DOCUMENT : "has"
    SELLER_PROFILE ||--|| SELLER_THEME : "has"
```
