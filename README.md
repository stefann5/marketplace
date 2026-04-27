# Multi-Tenant Shopping Platform — Project Specification

## 1. Project Overview

A multi-tenant marketplace platform where buyers browse and purchase merchandise from multiple sellers through a unified storefront. Sellers operate within isolated tenant environments where they can manage products, customize their shop appearance, and view business analytics. An AI-powered chatbot assists buyers with product discovery through natural language.

**Type:** Academic project  
**Architecture:** Microservices  
**Backend:** Java (Spring Boot); AI/Chat service in Python (FastAPI)  
**Frontend:** Angular + PrimeNG  
**Communication:** REST (synchronous), RabbitMQ (asynchronous)

---

## 2. User Roles

### Buyer
- Browse the marketplace and individual seller shops
- Search products by name, filter by category and price range, sort by price/date/rating (default: rating)
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
         └── AI/Chat Service (FastAPI)
                │
                ├── MongoDB (chat sessions)
                ├── Catalog Service (REST: category tree + product search)
                └── External LLM API (tool-calling)
```

### 3.2 API Gateway

The gateway is the single external entry point. All downstream services are only accessible through the gateway via an internal Docker network.

- Validates JWT (signature, expiry)
- Decodes claims and forwards as internal headers: `X-User-Id`, `X-User-Role`, `X-Tenant-Id`
- Strips the original Authorization header before forwarding
- Downstream services trust these headers implicitly — they do not handle JWT themselves

### 3.3 Inter-Service Communication

- **Synchronous (REST):** Order Service → Catalog Service for stock validation at checkout; AI/Chat Service → Catalog Service for category tree and product search
- **Asynchronous (RabbitMQ):** Event-driven communication for analytics ingestion

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
- Sorting by price, date of posting (update date), and rating (default sort: rating descending)
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
category (id, name, parent_id)
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
- Seller onboarding: profile creation with company name, description, contact info (phone, email, address), logo, and document upload
- Documents stored in MinIO with private access (presigned URLs for viewing)
- Seller status lifecycle: PENDING_APPROVAL → ACTIVE / REJECTED (admin can also SUSPEND)
- Seller profile: company name, description, contact phone, contact email, contact address (optional), logo
- Shop URL slug: `platform.com/shop/:sellerSlug`

**Storefront customization:**
- PrimeNG theme preset selection via palette picker (amber, blue, green, indigo, etc.)
- Dynamic theme switching using `updatePrimaryPalette()` from `@primeuix/themes`
- Custom font family and border radius
- Shop banner and logo

Theme configuration stored in PostgreSQL:

```
seller_theme (seller_id, preset, primary_color, font_family, border_radius, banner_url, logo_url)
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

**Seller dashboard metrics (tenant-scoped):**

- **Revenue:** Total revenue plus today / this week / this month / this year, with month-over-month percentage change. Revenue over time as a line chart (`period=week` → last 7 days by day, `period=month` → last 30 days by day, `period=year` → last 12 months by month).
- **Orders:** Total orders split into fulfilled and unfulfilled, plus an orders-over-time bar chart with the same `week` / `month` / `year` / `all` granularity options.
- **Top products:** Top 10 products, sorted by revenue or by units sold (toggle).
- **Product views:** Top 20 products by view count.
- **Search terms:** Top 20 search terms across the platform (global, not tenant-scoped; this endpoint ignores the caller's tenant).

**Marketplace-wide endpoint:**

- **Top categories:** `GET /api/analytics/categories/top` returns the top N categories by revenue across all sellers. Consumed by the marketplace home page, not by the seller dashboard.

**Database:** MongoDB (time-series collections for events)

### 4.6 AI / Chat Service

**Responsibility:** AI-powered product recommendations via conversational interface using LLM tool-calling against the existing catalog search API.

**Runtime:** Python 3 / FastAPI.

**How it works:**

- The service exposes a small REST API for chat sessions and messages: list sessions, create session, fetch session, delete session, and send a message to a session (`/api/chat/sessions[/{id}/messages]`). Chat sessions and message history are persisted in MongoDB.
- Product retrieval is delegated to the catalog service — the chat service calls the existing catalog search endpoint (`GET /api/products?name=…&categoryId=…&…`) over REST.
- On startup (and every 30 min) it fetches the category tree from the catalog service and builds an in-memory lookup (`categoryPath → categoryId`, with `difflib` fuzzy matching for near misses).
- On each user message, the service calls an **OpenAI-compatible chat completions endpoint** (Together AI / Llama 3.3 70B Instruct Turbo) with a single tool defined: `search_products(name, categoryPath, minPrice, maxPrice, minRating, sortBy, sortDirection, limit)`. The LLM decides when to call it, with what arguments, and can issue multiple parallel tool calls (one per category) for multi-intent requests.
- For every `search_products` tool call the LLM makes, the service fans out **three** parallel catalog search requests — `(name + category + filters)`, `(category + filters, no name)`, `(name only, no category)` — and merges the deduplicated union into the tool result it returns to the LLM. This widens the candidate pool so the LLM can reject off-topic matches.
- After it has enough results, the LLM returns a final JSON object of the form `{ "_reasoning": "…", "message": "…", "products": [{ "id": "<uuid>", "score": 0-100 }, …] }`. The service filters by a score threshold, orders by score, caps at `chat_max_products`, and returns the matching `ProductSummary` records to the client.
- The service surfaces prior turns' `searchParams` and `productNames` back to the LLM as bracketed hints on each stored assistant message, so the model can **TUNE** previous searches (cheaper, different sort, tighter category) or **REPLACE** them when the user pivots to a new subject.

**Database:** MongoDB (`chat_db.chat_sessions` — one document per conversation, with embedded messages).

**External dependencies:**

- Catalog Service — `GET /api/categories`, `GET /api/products`
- LLM provider — OpenAI-compatible `/v1/chat/completions` with tool-calling (Together AI by default; configurable via `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY`)

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
| AI/Chat Service | 8086 | MongoDB | — (REST to Catalog Service + external LLM) |

### 5.2 Object Storage (MinIO)

Images and files are stored in MinIO, running as a container alongside the services.

| Bucket | Access | Usage |
|---|---|---|
| `products` | Public | Product images — each product can have multiple images, URLs stored in a separate `product_image` table |
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
├── chat-service/           (Python / FastAPI — AI chat)
├── frontend/               (Angular)
├── seed/                   (Python data-seeding pipeline)
└── docker-compose.yml
```

---

## 6. Database Seeding

The platform is seeded in two layers:

1. **Static seeds inside each service** — checked-in `data.sql` files that Spring Boot loads on startup (`spring.sql.init.mode=always`, `spring.jpa.defer-datasource-initialization=true`). These cover the small, deterministic things: users, seller profiles, categories.
2. **A Python pipeline in `seed/`** — generates products, images, orders, reviews, and seller logos using a self-hosted LLM and image model. This is what fills the marketplace with realistic content.

Cross-service references use **deterministic UUIDs** (no shared FKs across service databases):

| Entity | Pattern |
|---|---|
| Seller user | `a0000000-0000-0000-0000-{n:012d}`     (auth-service) |
| Seller tenant | `b0000000-0000-0000-0000-{n:012d}`    (auth + seller + catalog) |
| Seller profile | `c0000000-0000-0000-0000-{n:012d}`   (seller-service) |
| Buyer user | `d0000000-0000-0000-0000-{n:012d}`       (auth-service) |
| Product | `uuid5(NAMESPACE, "product-{seller_n}-{name}")` |

That way the Python scripts can reference rows in other services' databases by just computing the id from the seller/buyer index — no joins, no lookup tables.

### 6.1 What gets seeded

**From service `data.sql` files (loaded on service startup):**

- **`auth-service/data.sql`** — 1 admin + 20 SELLER accounts + 300 BUYER accounts (the buyers are inserted via `generate_series(1, 300)`). All accounts use the same password: `password123`.
- **`seller-service/data.sql`** — 20 `seller_profiles` rows with company name, description, slug, contact info, and a varied PrimeNG theme per seller.
- **`catalog-service/data.sql`** — 25 top-level departments + 158 leaf subcategories.

**From the `seed/` Python pipeline (generated content):**

- **~2,400 products** — 20 sellers × ~158 leaf categories × N products per category, generated by an LLM.
- **~7,000 product images** — 3 angle variations per product (front view, three-quarter view, detail shot), generated by a diffusion model on a GPU and uploaded to MinIO.
- **20 seller logos** — flat vector brand emblems generated by the same image model, one per seller.
- **Orders** — every buyer performs N checkouts; each checkout is split into one order per seller (mirroring `CheckoutService.checkout`); a guarantee pass tops up any product that ended up with fewer than 10 unique buyers.
- **Analytics events** — `ORDER_PLACED` (one per order item) and `ORDER_FULFILLED` documents are written directly to MongoDB so dashboards work without needing RabbitMQ replay.
- **Reviews** — the LLM produces a pool of 50 generic reviews per department (80% positive / 10% neutral / 10% negative). Every buyer who actually purchased a product is then assigned one review from that product's department pool. `products.review_count` and `products.average_rating` are recomputed from the inserted reviews.

### 6.2 Prerequisites

- All services have been started at least once so their JPA entities have created the tables. After that, the Spring `data.sql` files will populate users / sellers / categories on the next restart.
- Docker stack running: PostgreSQL, MongoDB, MinIO, RabbitMQ.
- An LLM server reachable at `LLM_URL` in [seed/config.py](seed/config.py). The pipeline expects an **OpenAI-compatible `/v1/chat/completions`** endpoint (e.g. vLLM serving Llama 3.3 70B Instruct).
- An image-generation server reachable at `IMAGE_SERVER_URL`. [seed/image_server.py](seed/image_server.py) is a small FastAPI wrapper around `diffusers.AutoPipelineForText2Image` (FLUX.1-schnell or SDXL-Turbo) and is meant to be run on a GPU host. A Dockerfile is provided ([seed/Dockerfile.image-server](seed/Dockerfile.image-server)).

Install Python deps:

```bash
cd seed
pip install -r requirements.txt
```

All endpoints, credentials, output paths, buyer count, and per-category counts live in [seed/config.py](seed/config.py).

### 6.3 Run order

The pipeline is broken into independent, **resumable, idempotent** steps. Each step writes its progress atomically (tmp file + rename, or `INSERT ... ON CONFLICT DO NOTHING`), so you can `Ctrl+C` and re-run any step.

```bash
cd seed

# 1. Products: LLM generates ~2.4k products into output/products.json
python generate_products.py

# 2. Product images: 3 images per product into output/images/{id}_{0..2}.jpg
python generate_images.py --images-per-product 3

# 3. Insert products + upload images into catalog_db + MinIO
python seed_db.py

# 4. Seller logos
python generate_seller_logos.py
python seed_seller_logos.py

# 5. Orders: 300 buyers checkout against the catalog, with a guarantee
#    pass that ensures every product has >=10 unique buyers
python seed_orders.py
python fulfill_orders.py        # flip every PURCHASED order to FULFILLED

# 6. Reviews: LLM generates a per-department review pool, then assigns
#    one review per (product, buyer) pair from order history
python generate_reviews.py
python seed_reviews.py
```

Useful flags:

| Script | Flag | Purpose |
|---|---|---|
| `generate_products.py` | `--per-category N` | Products per (seller, leaf category) |
| `generate_images.py`   | `--images-per-product N`, `--limit N` | Variations per product, cap total |
| `seed_db.py`           | `--clean` | Wipe `products` + `product_images` first |
| `seed_orders.py`       | `--checkouts-per-buyer N`, `--max-items-per-cart N`, `--fulfilled-ratio F`, `--guarantee-min-buyers N` | Tune cart sizes and buyer/product coverage |
| `generate_reviews.py`  | `--per-department N` | Reviews per top-level department |
| `seed_seller_logos.py` | `--clean` | Force re-upload of all seller logos |

### 6.4 What each step actually does

- **`generate_products.py`** — iterates `SELLERS × leaf categories`, builds an LLM prompt that includes the seller's niche and the names already generated (so the model avoids duplicates), and asks for a JSON array of products. Saves atomically and resumes from the existing `output/products.json`.
- **`generate_images.py`** — calls the remote `/generate` endpoint on the image server with a different angle prompt per index. Files are written to a `.tmp` path and renamed only on success.
- **`seed_db.py`** — inserts products into `catalog_db.products` (`ON CONFLICT (id) DO NOTHING`), uploads each image file to MinIO under `{productId}/{uuid}.jpg`, and inserts a `product_images` row pointing to the public URL.
- **`generate_seller_logos.py` / `seed_seller_logos.py`** — same pattern but for seller logos. Uploads to the `seller-documents` bucket at `{profileId}/logo.jpg` and updates `seller_profiles.logo_url`. The bucket's public-read policy on `*/logo*` is set by [seller-service MinioService](seller-service/src/main/java/com/platform/seller/service/MinioService.java) on startup, so the seller-service must have started at least once for logos to be browser-accessible.
- **`seed_orders.py`** — for each buyer: builds N random carts of up to K products with random quantities, groups items by `tenant_id`, creates one `Order` per tenant (mirroring [`CheckoutService.checkout`](order-service/src/main/java/com/platform/order/service/CheckoutService.java)), inserts into `order_db`, decrements stock and bumps `purchase_count` in `catalog_db.products` (mirroring [`ProductService.decrementStock`](catalog-service/src/main/java/com/platform/catalog/service/ProductService.java)), and writes `ORDER_PLACED` / `ORDER_FULFILLED` documents directly into `analytics_db.analytics_events`. A second **guarantee pass** scans products with fewer than `--guarantee-min-buyers` unique buyers and adds extra one-item orders from random unused buyers until the quota is met. Stock is tracked locally so the seeder never oversells.
- **`fulfill_orders.py`** — flips every remaining `PURCHASED` order to `FULFILLED` and writes the matching `ORDER_FULFILLED` analytics events. Idempotent against both Postgres and Mongo.
- **`generate_reviews.py`** — for each of the 25 top-level departments, asks the LLM for 50 generic reviews stratified into 80% positive / 10% neutral / 10% negative. Reviews are deliberately generic (no brand or product names) so any review can be slotted onto any product in that department. Output: `output/reviews.json` keyed by department.
- **`seed_reviews.py`** — joins `order_db.orders + order_db.order_items` to find every `(product_id, buyer_id)` pair plus the earliest purchase date, picks a random review from the product's department pool, inserts into `catalog_db.reviews` with `created_at >= first_purchase + 1 day`, then bulk-recomputes `products.review_count` and `products.average_rating` in one `UPDATE ... FROM (SELECT ... GROUP BY product_id)`. Idempotent via the `UNIQUE(product_id, user_id)` constraint.

### 6.5 Image-generation server

The image model runs out-of-process so the rest of the pipeline can stay on a laptop while heavy GPU work happens on a remote machine. Two ways to run it:

```bash
# Bare metal (on the GPU host)
cd seed
pip install -r requirements-server.txt
python image_server.py --model black-forest-labs/FLUX.1-schnell --device cuda:0 --port 8888

# Docker (on the GPU host)
docker build -f seed/Dockerfile.image-server -t image-server seed/
docker run --rm --gpus '"device=0"' -p 8888:8888 image-server
```

The local pipeline reaches it via `IMAGE_SERVER_URL` in [seed/config.py](seed/config.py). VS Code port forwarding works fine if the GPU host is remote.
