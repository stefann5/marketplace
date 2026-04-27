# Sequence Diagram — Seller Registration & Approval

```mermaid
sequenceDiagram
    actor Seller
    actor Admin
    participant GW as API Gateway
    participant AS as Auth Service
    participant SS as Seller Service
    participant SMTP as Fake SMTP

    Seller->>GW: POST /api/auth/register (role: SELLER)
    GW->>AS: register user
    AS->>AS: create User (role=SELLER, tenantId=new UUID, emailVerified=false)
    AS->>SMTP: send verification code e-mail
    AS-->>GW: RegisterResponse (verification code sent)
    GW-->>Seller: check your e-mail

    Seller->>GW: POST /api/auth/verify-email { email, code }
    GW->>AS: verify
    AS->>AS: mark emailVerified=true
    AS-->>GW: 204 No Content
    GW-->>Seller: e-mail verified

    Seller->>GW: POST /api/sellers/register-public?email=... (profile + documents + logo)
    GW->>SS: create seller profile
    SS->>AS: GET /internal/auth/users/by-email
    AS-->>SS: InternalAuthUserResponse (userId, tenantId, role=SELLER, emailVerified=true)
    SS->>SS: persist SellerProfile (status=PENDING_APPROVAL)
    SS->>SS: upload documents to MinIO (private)
    SS->>SS: upload logo to MinIO (public)
    SS-->>GW: SellerProfileResponse
    GW-->>Seller: profile created, pending approval

    Admin->>GW: GET /api/admin/sellers?status=PENDING_APPROVAL
    GW->>SS: list pending sellers
    SS-->>GW: List~SellerProfileResponse~
    GW-->>Admin: pending applications

    Admin->>GW: POST /api/admin/sellers/{id}/approve
    GW->>SS: approve seller
    SS->>SS: status = ACTIVE
    SS-->>GW: 204 No Content
    GW-->>Admin: approved

    Seller->>GW: POST /api/auth/login
    GW->>AS: login
    AS->>SS: GET /internal/sellers/{userId}/status
    SS-->>AS: ACTIVE
    AS-->>GW: JwtResponse (access + refresh + sellerStatus=ACTIVE)
    GW-->>Seller: JWT tokens (can access dashboard)
```
