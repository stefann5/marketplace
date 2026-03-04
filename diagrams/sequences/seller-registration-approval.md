# Sequence Diagram — Seller Registration & Approval

```mermaid
sequenceDiagram
    actor Seller
    actor Admin
    participant GW as API Gateway
    participant AS as Auth Service
    participant SS as Seller Service

    Seller->>GW: POST /auth/register (role: SELLER)
    GW->>AS: register user
    AS->>AS: create User (role=SELLER, tenantId=new UUID)
    AS-->>GW: JWT token
    GW-->>Seller: JWT

    Seller->>GW: POST /sellers/register (profile + documents)
    GW->>SS: create seller profile
    SS->>SS: persist SellerProfile (status=PENDING_APPROVAL)
    SS-->>GW: SellerProfile
    GW-->>Seller: profile created

    Admin->>GW: GET /admin/sellers/pending
    GW->>SS: list pending sellers
    SS-->>GW: List~SellerProfile~
    GW-->>Admin: pending applications

    Admin->>GW: POST /admin/sellers/{id}/approve
    GW->>SS: approve seller
    SS->>SS: status = ACTIVE
    SS-->>GW: SellerProfile (ACTIVE)
    GW-->>Admin: approved
```
