# Multi-Tenant Shopping Platform — Project Specification

## 1. Project Overview

A multi-tenant marketplace platform where buyers browse and purchase merchandise from multiple sellers through a unified storefront. Sellers operate within isolated tenant environments where they can manage products, customize their shop appearance, and view business analytics. An AI-powered chatbot assists buyers with product discovery through natural language.

**Type:** Academic project  
**Architecture:** Microservices  
**Backend:** Java (Spring Boot)  
**Frontend:** Angular + PrimeNG  
**Communication:** REST (synchronous), RabbitMQ (asynchronous)

---

## 2. User Roles

### Buyer
- Browse the marketplace and individual seller shops
- Search products by name, filter by category and price range, sort by price/date
- Add products from multiple sellers to a single shopping cart
- Complete purchases (checkout splits into per-seller sub-orders)
- View order history (read-only, status shown as "Purchased")
- Interact with AI chatbot for product recommendations

### Seller
- Register with company documentation (requires admin approval)
- Manage products (CRUD) within their tenant scope
- Assign products to platform-level categories
- Customize shop appearance using PrimeNG theming
- View incoming orders and mark them as "Fulfilled" for internal tracking
- View order history for their merchandise
- Access analytics dashboard (revenue, top products, order metrics)

### Admin
- Review and approve/reject seller applications
- View all registered sellers
- Manage platform-level categories
- Suspend active sellers

---

## 3. Architecture

### 3.1 Microservices

Six services plus an API Gateway, each a standalone Spring Boot application with its own database and port.

```
┌──────────────────┐
│    API Gateway    │  (Spring Cloud Gateway)
│  JWT validation   │  Routes requests, decodes JWT, forwards
│  Tenant routing   │  X-User-Id, X-User-Role, X-Tenant-Id headers
└────────┬─────────┘
         │
         ├── Auth Service
         ├── Catalog Service ──publishes events──► RabbitMQ
         ├── Seller Service (+ Admin endpoints)            │
         ├── Order Service ────publishes events──► RabbitMQ │
         ├── Analytics Service ◄──consumes events──────────┘
         └── AI/Chat Service ◄──consumes events────────────┘
                │
                ├── MongoDB (vector store)
                └── External LLM API
```

### 3.2 API Gateway

The gateway is the single external entry point. All downstream services are only accessible through the gateway via an internal Docker network.

- Validates JWT (signature, expiry)
- Decodes claims and forwards as internal headers: `X-User-Id`, `X-User-Role`, `X-Tenant-Id`
- Strips the original Authorization header before forwarding
- Downstream services trust these headers implicitly — they do not handle JWT themselves

### 3.3 Inter-Service Communication

- **Synchronous (REST):** Order Service → Catalog Service for stock validation at checkout
- **Asynchronous (RabbitMQ):** Event-driven communication for analytics ingestion and AI service product indexing

### 3.4 Database Strategy

Shared database with `tenant_id` column for the product catalog and orders. This enables cross-seller marketplace queries (search, filtering, sorting) without fan-out across isolated databases.

Seller-specific configuration (profiles, documents, themes) is stored in the Seller Service's own database.

---

## 4. Service Specifications

### 4.1 Auth Service

**Responsibility:** User identity and authentication.

- User registration (as Buyer or Seller)
- Login / JWT issuance with claims: `userId`, `role`, `tenantId`
- Token refresh
- Role management: BUYER, SELLER, ADMIN

**Database:** PostgreSQL (users, credentials, roles)

### 4.2 Catalog Service

**Responsibility:** Product catalog, categories, and marketplace browsing.

- Product CRUD (seller-scoped by tenant)
- Product search by name
- Filtering by category, price range, and minimum rating
- Sorting by price and date of posting (update date)
- Out-of-stock products are displayed but annotated accordingly
- Product reviews and ratings (see Reviews below)
- Platform category management (admin-only endpoints)
- Publishes `PRODUCT_VIEWED` and `PRODUCT_SEARCHED` events to RabbitMQ

**Database:** PostgreSQL (products, categories, reviews)

#### Reviews

Buyers can leave a review on any product they have purchased. The Catalog Service verifies the purchase by calling the Order Service before allowing a review.

- One review per user per product (can be edited, not duplicated)
- Verified purchases only — buyer must have a completed order containing the product
- Rating: 1–5 stars (integer, required)
- Comment: text (optional)
- Buyer's name is displayed alongside the review
- No seller responses
- Average rating, review count, and purchase count are denormalized on the product record and updated on review creation/edit (or order placement) to avoid recomputing on every product listing query

#### Categories

Platform-level hierarchical categories managed by the admin, pre-seeded by scraping a major marketplace (Amazon/Temu). Sellers assign their products to leaf categories only.

```sql
category (id, name, parent_id, display_order)
```

- Hierarchical with recursive CTE for subtree queries
- Depth limited to 3 levels
- Frontend only displays categories that contain at least one product
- Sellers must select a leaf-level category when listing a product

### 4.3 Order Service

**Responsibility:** Shopping cart, checkout, and order lifecycle.

- Cart management (add, remove, update quantities) — works across multiple sellers
- Checkout: validate stock → create order → decrement stock → confirm
- Multi-seller cart is split into sub-orders per tenant on checkout
- Stock management uses optimistic locking (`@Version` column) — no pessimistic database locks
- Order history for buyers (read-only, status: `PURCHASED`)
- Order list for sellers (filtered by tenant, with fulfilled/unfulfilled toggle)
- Sellers can mark orders as `FULFILLED` — tracked via `OrderStatus` enum, not visible to buyers
- No cancellations, no refunds, no complex status workflows
- Publishes `ORDER_PLACED` and `ORDER_FULFILLED` events to RabbitMQ

**Database:** PostgreSQL (carts, orders, order_items)

### 4.4 Seller Service (+ Admin Endpoints)

**Responsibility:** Seller identity, onboarding, storefront customization, and admin operations.

**Seller management:**
- Seller onboarding: profile creation with company document upload
- Seller status lifecycle: PENDING_APPROVAL → ACTIVE / REJECTED (admin can also SUSPEND)
- Seller profile: company name, description, contact info, logo
- Shop URL slug: `platform.com/shop/:sellerSlug`

**Storefront customization:**
- PrimeNG theme preset selection (Lara Light, Lara Dark, Aura, etc.)
- Custom colors (primary, accent), font family, border radius
- Shop banner and logo

Theme configuration stored in PostgreSQL:

```
seller_theme (seller_id, preset, primary_color, accent_color, font_family, border_radius, banner_url, logo_url)
```

**Admin endpoints (role-guarded):**
- List pending seller applications
- Approve / reject sellers
- View all sellers
- Suspend active sellers

**Database:** PostgreSQL (seller profiles, documents, theme settings)

### 4.5 Analytics Service

**Responsibility:** Event ingestion and seller-facing business intelligence.

**Event consumption (via RabbitMQ):**

| Source | Event | Key Data |
|---|---|---|
| Catalog Service | `PRODUCT_VIEWED` | tenantId, productId, userId, timestamp |
| Catalog Service | `PRODUCT_SEARCHED` | searchTerm, resultProductIds, timestamp |
| Order Service | `ORDER_PLACED` | tenantId, orderId, items (productId, quantity, price), timestamp |
| Order Service | `ORDER_FULFILLED` | tenantId, orderId, timestamp |

Events stored as documents in MongoDB time-series collections:

```json
{
  "tenantId": "seller-123",
  "eventType": "ORDER_PLACED",
  "productId": "prod-456",
  "userId": "user-789",
  "metadata": {
    "quantity": 2,
    "unitPrice": 29.99,
    "orderTotal": 59.98,
    "category": "electronics"
  },
  "timestamp": "2026-03-02T14:30:00Z"
}
```

**Seller dashboard metrics:**

- **Revenue:** Total revenue (today/week/month/year with period comparison), revenue over time (line chart, selectable granularity), revenue by category (pie chart)
- **Orders:** Total orders by fulfilled/unfulfilled, orders over time (bar chart), average order value trend, average time to fulfill
- **Product performance:** Top 10 products by revenue, top 10 by units sold, worst performing products, low stock warnings
- **Customer behavior:** Product view counts, view-to-purchase conversion rate per product, most searched terms leading to their products, peak shopping hours heatmap (day of week × hour)

**Database:** MongoDB (time-series collections for events)

### 4.6 AI / Chat Service

**Responsibility:** AI-powered product recommendations via conversational interface using RAG.

- Consumes product events from RabbitMQ (product created/updated/deleted)
- Generates vector embeddings (sentence transformer) for product data (name + description + category + price)
- Stores embeddings in MongoDB vector store (index auto-updates)
- On buyer query: performs vector similarity search → retrieves relevant products → feeds context into LLM
- LLM returns structured response (product IDs + explanation), frontend renders product cards with links
- Uses external LLM API (not locally hosted)

**Database:** MongoDB (vector store with product embeddings)

---

## 5. Infrastructure

### 5.1 Service Map

| Service | Port | Database | Message Queue |
|---|---|---|---|
| API Gateway | 8080 | — | — |
| Auth Service | 8081 | PostgreSQL | — |
| Catalog Service | 8082 | PostgreSQL | RabbitMQ (producer) |
| Order Service | 8083 | PostgreSQL | RabbitMQ (producer) |
| Seller Service | 8084 | PostgreSQL | RabbitMQ (consumer, optional) |
| Analytics Service | 8085 | MongoDB | RabbitMQ (consumer) |
| AI/Chat Service | 8086 | MongoDB | RabbitMQ (consumer) |

### 5.2 Object Storage (MinIO)

Images and files are stored in MinIO, running as a container alongside the services.

| Bucket | Access | Usage |
|---|---|---|
| `products` | Public | Product images — URL stored directly on the product record |
| `seller-documents` | Private | Seller registration documents — only the object key is stored; presigned URLs are generated on demand |

Seller profile logos and theme banners are stored in a public bucket (they are displayed on the storefront), so their URLs are stored directly on the record. Only business registration documents are private and accessed via presigned URLs.

### 5.3 Deployment

All services containerized with Docker. A single `docker-compose.yml` defines all services, databases, RabbitMQ, MinIO, and the internal network. Only the API Gateway exposes a port to the host — all other services communicate on the internal Docker network.

### 5.3 Project Structure

```
shopping-platform/
├── api-gateway/
├── auth-service/
├── catalog-service/
├── order-service/
├── seller-service/
├── analytics-service/
├── ai-chat-service/
├── frontend/               (Angular)
└── docker-compose.yml
```
