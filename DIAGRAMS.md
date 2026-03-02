# Architecture & Class Diagrams

> All diagrams are rendered by GitHub's Mermaid support. Open this file on GitHub to view them.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Class Diagrams](#2-class-diagrams)
   - [Auth Service](#21-auth-service)
   - [Catalog Service](#22-catalog-service)
   - [Order Service](#23-order-service)
   - [Seller Service](#24-seller-service)
   - [Analytics Service](#25-analytics-service)
   - [AI / Chat Service](#26-ai--chat-service)
3. [Database ER Diagrams](#3-database-er-diagrams)
   - [Auth Service DB](#31-auth-service-db)
   - [Catalog Service DB](#32-catalog-service-db)
   - [Order Service DB](#33-order-service-db)
   - [Seller Service DB](#34-seller-service-db)
4. [Sequence Diagrams](#4-sequence-diagrams)
   - [Checkout Flow](#41-checkout-flow)
   - [AI Chat Flow](#42-ai-chat-flow)
   - [Product Indexing Flow](#43-product-indexing-flow)
   - [Seller Registration & Approval](#44-seller-registration--approval)

---

## 1. System Architecture

```mermaid
graph TD
    Client["🌐 Browser / Mobile"]

    subgraph Gateway["API Gateway :8080 (Spring Cloud Gateway)"]
        GW["JWT Validation\nHeader Forwarding\nTenant Routing"]
    end

    subgraph Services["Microservices (internal Docker network)"]
        Auth["Auth Service :8081\nPostgreSQL"]
        Catalog["Catalog Service :8082\nPostgreSQL"]
        Order["Order Service :8083\nPostgreSQL"]
        Seller["Seller Service :8084\nPostgreSQL"]
        Analytics["Analytics Service :8085\nMongoDB"]
        AI["AI/Chat Service :8086\nMongoDB"]
    end

    MQ["🐇 RabbitMQ"]
    LLM["☁️ External LLM API"]

    Client --> GW
    GW --> Auth
    GW --> Catalog
    GW --> Order
    GW --> Seller
    GW --> Analytics
    GW --> AI

    Catalog -- "PRODUCT_VIEWED\nPRODUCT_SEARCHED" --> MQ
    Order -- "ORDER_PLACED\nORDER_FULFILLED" --> MQ

    MQ --> Analytics
    MQ --> AI

    Order -- "stock validation (REST)" --> Catalog
    Catalog -- "purchase verification (REST)" --> Order

    AI --> LLM
```

---

## 2. Class Diagrams

### 2.1 Auth Service

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
        +String passwordHash
        +Role role
        +UUID tenantId
        +LocalDateTime createdAt
    }

    class Role {
        <<enumeration>>
        BUYER
        SELLER
        ADMIN
    }

    class AuthController {
        +register(RegisterRequest) ResponseEntity
        +login(LoginRequest) JwtResponse
        +refresh(RefreshRequest) JwtResponse
    }

    class AuthService {
        +register(RegisterRequest) User
        +login(String, String) JwtResponse
        +refreshToken(String) JwtResponse
    }

    class JwtService {
        +generateToken(User) String
        +validateToken(String) Claims
        +extractUserId(String) UUID
    }

    class UserRepository {
        <<interface>>
        +findByEmail(String) Optional~User~
    }

    User --> Role
    AuthController --> AuthService
    AuthService --> JwtService
    AuthService --> UserRepository
    UserRepository ..> User
```

---

### 2.2 Catalog Service

```mermaid
classDiagram
    class Product {
        +UUID id
        +UUID tenantId
        +String name
        +String description
        +BigDecimal price
        +int stock
        +int version
        +UUID categoryId
        +double averageRating
        +int reviewCount
        +LocalDateTime createdAt
        +LocalDateTime updatedAt
    }

    class Category {
        +UUID id
        +String name
        +UUID parentId
        +int displayOrder
    }

    class Review {
        +UUID id
        +UUID productId
        +UUID userId
        +String buyerName
        +int rating
        +String comment
        +LocalDateTime createdAt
        +LocalDateTime updatedAt
    }

    class ProductController {
        +getProducts(SearchCriteria) Page~Product~
        +getProduct(UUID) Product
        +createProduct(ProductRequest) Product
        +updateProduct(UUID, ProductRequest) Product
        +deleteProduct(UUID) void
    }

    class ReviewController {
        +getReviews(UUID) List~Review~
        +createReview(UUID, ReviewRequest) Review
        +updateReview(UUID, ReviewRequest) Review
    }

    class CategoryController {
        +getCategories() List~Category~
        +createCategory(CategoryRequest) Category
        +deleteCategory(UUID) void
    }

    class ProductService {
        +searchProducts(SearchCriteria) Page~Product~
        +getProduct(UUID) Product
        +createProduct(UUID tenantId, ProductRequest) Product
        +updateProduct(UUID, ProductRequest) Product
        +deleteProduct(UUID) void
        -publishProductEvent(Product, EventType) void
    }

    class ReviewService {
        +getReviews(UUID productId) List~Review~
        +createReview(UUID productId, UUID userId, ReviewRequest) Review
        +updateReview(UUID reviewId, UUID userId, ReviewRequest) Review
        -verifyPurchase(UUID userId, UUID productId) boolean
        -updateProductRating(UUID productId) void
    }

    class CategoryService {
        +getAll() List~Category~
        +getSubtree(UUID) List~Category~
        +create(CategoryRequest) Category
        +delete(UUID) void
    }

    class ProductEventPublisher {
        +publishProductViewed(UUID tenantId, UUID productId, UUID userId) void
        +publishProductSearched(String term, List~UUID~ resultIds) void
    }

    Product --> Category : "belongs to"
    Review --> Product : "reviews"
    Category --> Category : "parent of"
    ProductController --> ProductService
    ReviewController --> ReviewService
    CategoryController --> CategoryService
    ProductService --> ProductEventPublisher
    ReviewService --> ProductService : "update rating"
```

---

### 2.3 Order Service

```mermaid
classDiagram
    class Cart {
        +UUID id
        +UUID userId
        +LocalDateTime updatedAt
    }

    class CartItem {
        +UUID id
        +UUID cartId
        +UUID productId
        +UUID tenantId
        +int quantity
        +BigDecimal unitPrice
    }

    class Order {
        +UUID id
        +UUID userId
        +UUID tenantId
        +OrderStatus status
        +boolean fulfilled
        +BigDecimal total
        +LocalDateTime createdAt
    }

    class OrderItem {
        +UUID id
        +UUID orderId
        +UUID productId
        +int quantity
        +BigDecimal unitPrice
    }

    class OrderStatus {
        <<enumeration>>
        PURCHASED
    }

    class CartController {
        +getCart(UUID userId) Cart
        +addItem(AddItemRequest) Cart
        +updateItem(UUID itemId, int qty) Cart
        +removeItem(UUID itemId) Cart
    }

    class OrderController {
        +checkout(UUID userId) List~Order~
        +getBuyerOrders(UUID userId) List~Order~
        +getSellerOrders(UUID tenantId) List~Order~
        +fulfillOrder(UUID orderId) Order
        +hasUserPurchasedProduct(UUID userId, UUID productId) boolean
    }

    class CartService {
        +getCart(UUID userId) Cart
        +addItem(UUID userId, UUID productId, int qty) Cart
        +updateItem(UUID userId, UUID itemId, int qty) Cart
        +removeItem(UUID userId, UUID itemId) Cart
        +clearCart(UUID userId) void
    }

    class CheckoutService {
        +checkout(UUID userId) List~Order~
        -validateStock(List~CartItem~) void
        -splitByTenant(List~CartItem~) Map~UUID, List~CartItem~~
        -decrementStock(List~CartItem~) void
        -publishOrderPlaced(Order) void
    }

    class OrderService {
        +getBuyerOrders(UUID userId) List~Order~
        +getSellerOrders(UUID tenantId) List~Order~
        +fulfillOrder(UUID orderId) void
        +hasUserPurchasedProduct(UUID userId, UUID productId) boolean
    }

    class OrderEventPublisher {
        +publishOrderPlaced(Order) void
        +publishOrderFulfilled(Order) void
    }

    Cart "1" --> "many" CartItem
    Order "1" --> "many" OrderItem
    Order --> OrderStatus
    CartController --> CartService
    OrderController --> CheckoutService
    OrderController --> OrderService
    CheckoutService --> CartService
    CheckoutService --> OrderEventPublisher
    OrderService --> OrderEventPublisher
```

---

### 2.4 Seller Service

```mermaid
classDiagram
    class SellerProfile {
        +UUID id
        +UUID userId
        +String companyName
        +String description
        +String contactInfo
        +String logoUrl
        +String slug
        +SellerStatus status
        +LocalDateTime createdAt
    }

    class SellerDocument {
        +UUID id
        +UUID sellerId
        +String documentUrl
        +LocalDateTime uploadedAt
    }

    class SellerTheme {
        +UUID sellerId
        +String preset
        +String primaryColor
        +String accentColor
        +String fontFamily
        +String borderRadius
        +String bannerUrl
        +String logoUrl
    }

    class SellerStatus {
        <<enumeration>>
        PENDING_APPROVAL
        ACTIVE
        REJECTED
        SUSPENDED
    }

    class SellerController {
        +registerSeller(SellerRequest) SellerProfile
        +getSellerBySlug(String slug) SellerProfile
        +updateProfile(SellerProfileRequest) SellerProfile
        +getTheme(UUID sellerId) SellerTheme
        +updateTheme(ThemeRequest) SellerTheme
    }

    class AdminController {
        +getPendingApplications() List~SellerProfile~
        +getAllSellers() List~SellerProfile~
        +approveSeller(UUID) SellerProfile
        +rejectSeller(UUID) SellerProfile
        +suspendSeller(UUID) SellerProfile
    }

    class SellerService {
        +registerSeller(UUID userId, SellerRequest) SellerProfile
        +getSellerBySlug(String) SellerProfile
        +getSellerById(UUID) SellerProfile
        +updateProfile(UUID, SellerProfileRequest) SellerProfile
        +getTheme(UUID) SellerTheme
        +updateTheme(UUID, ThemeRequest) SellerTheme
        +approveSeller(UUID) SellerProfile
        +rejectSeller(UUID) SellerProfile
        +suspendSeller(UUID) SellerProfile
    }

    SellerProfile "1" --> "many" SellerDocument : "has"
    SellerProfile "1" --> "1" SellerTheme : "has"
    SellerProfile --> SellerStatus
    SellerController --> SellerService
    AdminController --> SellerService
```

---

### 2.5 Analytics Service

```mermaid
classDiagram
    class AnalyticsEvent {
        +String id
        +String tenantId
        +EventType eventType
        +String productId
        +String userId
        +Map~String, Object~ metadata
        +Instant timestamp
    }

    class EventType {
        <<enumeration>>
        PRODUCT_VIEWED
        PRODUCT_SEARCHED
        ORDER_PLACED
        ORDER_FULFILLED
    }

    class AggregateSummary {
        +String id
        +String tenantId
        +String period
        +String metricType
        +double value
        +Instant computedAt
    }

    class AnalyticsEventConsumer {
        +handleProductViewed(ProductViewedEvent) void
        +handleProductSearched(ProductSearchedEvent) void
        +handleOrderPlaced(OrderPlacedEvent) void
        +handleOrderFulfilled(OrderFulfilledEvent) void
    }

    class AnalyticsDashboardController {
        +getRevenueSummary(String period) RevenueSummary
        +getRevenueOverTime(String granularity) List~DataPoint~
        +getRevenueByCategory() List~CategoryRevenue~
        +getOrderMetrics() OrderMetrics
        +getTopProducts() List~ProductMetric~
        +getCustomerBehavior() CustomerBehaviorReport
    }

    class AnalyticsService {
        +getRevenueSummary(String tenantId, String period) RevenueSummary
        +getRevenueOverTime(String tenantId, String granularity) List~DataPoint~
        +getOrderMetrics(String tenantId) OrderMetrics
        +getTopProducts(String tenantId) List~ProductMetric~
        +getSearchTerms(String tenantId) List~SearchTerm~
        +getPeakHours(String tenantId) HeatmapData
    }

    class EventRepository {
        <<interface>>
        +save(AnalyticsEvent) void
        +findByTenantIdAndTimestampBetween(String, Instant, Instant) List~AnalyticsEvent~
        +aggregateRevenueByPeriod(String tenantId, String period) List~DataPoint~
    }

    AnalyticsEvent --> EventType
    AnalyticsEventConsumer --> EventRepository
    AnalyticsDashboardController --> AnalyticsService
    AnalyticsService --> EventRepository
    AnalyticsService ..> AggregateSummary
```

---

### 2.6 AI / Chat Service

```mermaid
classDiagram
    class ProductEmbedding {
        +String id
        +String productId
        +String tenantId
        +String name
        +String description
        +String category
        +BigDecimal price
        +List~Double~ embedding
        +Instant indexedAt
    }

    class ChatSession {
        +String id
        +String userId
        +List~ChatMessage~ messages
        +LocalDateTime createdAt
    }

    class ChatMessage {
        +String id
        +MessageRole role
        +String content
        +LocalDateTime timestamp
    }

    class MessageRole {
        <<enumeration>>
        USER
        ASSISTANT
    }

    class ChatController {
        +sendMessage(ChatRequest) ChatResponse
        +getHistory(String userId) List~ChatMessage~
    }

    class ChatService {
        +processMessage(String userId, String message) ChatResponse
        -buildPrompt(String query, List~ProductEmbedding~ context) String
        -parseResponse(String llmResponse) ChatResponse
    }

    class EmbeddingService {
        +generateEmbedding(String text) List~Double~
        +indexProduct(ProductIndexEvent) void
        +removeProduct(String productId) void
    }

    class VectorSearchService {
        +findSimilarProducts(List~Double~ queryEmbedding, int topK) List~ProductEmbedding~
    }

    class LlmClient {
        <<interface>>
        +complete(String prompt) String
    }

    class ProductEventConsumer {
        +handleProductCreated(ProductCreatedEvent) void
        +handleProductUpdated(ProductUpdatedEvent) void
        +handleProductDeleted(ProductDeletedEvent) void
    }

    ChatSession "1" --> "many" ChatMessage
    ChatMessage --> MessageRole
    ChatController --> ChatService
    ChatService --> VectorSearchService
    ChatService --> LlmClient
    VectorSearchService ..> ProductEmbedding
    ProductEventConsumer --> EmbeddingService
    EmbeddingService ..> ProductEmbedding
```

---

## 3. Database ER Diagrams

### 3.1 Auth Service DB

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

---

### 3.2 Catalog Service DB

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

---

### 3.3 Order Service DB

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
        boolean fulfilled
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

---

### 3.4 Seller Service DB

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
        string document_url
        timestamp uploaded_at
    }

    SELLER_THEME {
        uuid seller_id PK_FK
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

---

## 4. Sequence Diagrams

### 4.1 Checkout Flow

```mermaid
sequenceDiagram
    actor Buyer
    participant GW as API Gateway
    participant OS as Order Service
    participant CS as Catalog Service
    participant MQ as RabbitMQ
    participant AS as Analytics Service

    Buyer->>GW: POST /orders/checkout
    GW->>OS: POST /checkout (X-User-Id, X-Tenant-Id headers)

    OS->>CS: GET /internal/products/stock-check (batch)
    CS-->>OS: stock availability

    OS->>OS: split cart items by tenantId

    OS->>CS: PATCH /internal/products/stock (decrement, optimistic lock)
    CS-->>OS: updated stock

    OS->>OS: persist orders & order items
    OS->>OS: clear cart

    OS-->>GW: List~Order~
    GW-->>Buyer: orders created

    OS--)MQ: ORDER_PLACED event (async)
    MQ--)AS: consume ORDER_PLACED
    AS->>AS: store analytics event in MongoDB
```

---

### 4.2 AI Chat Flow

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

---

### 4.3 Product Indexing Flow

```mermaid
sequenceDiagram
    participant CS as Catalog Service
    participant MQ as RabbitMQ
    participant AI as AI/Chat Service
    participant ES as Embedding Service
    participant VS as MongoDB Vector Store

    CS--)MQ: PRODUCT_CREATED / PRODUCT_UPDATED event
    MQ--)AI: deliver event (async)

    AI->>ES: indexProduct(event)
    ES->>ES: concatenate name + description + category + price
    ES->>ES: generate embedding (sentence transformer)
    ES->>VS: upsert ProductEmbedding document
```

---

### 4.4 Seller Registration & Approval

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
