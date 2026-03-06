# Auth Service — Class Diagram

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
        +String passwordHash
        +Role role
        +UUID tenantId
        +SellerStatus sellerStatus
        +LocalDateTime createdAt
    }

    class Role {
        <<enumeration>>
        BUYER
        SELLER
        ADMIN
    }

    class SellerStatus {
        <<enumeration>>
        PENDING
        ACTIVE
        REJECTED
    }

    class AuthController {
        +register(RegisterRequest) ResponseEntity
        +login(LoginRequest) JwtResponse
        +refresh(RefreshRequest) JwtResponse
    }

    class AdminSellerController {
        +listSellers(SellerStatus) ResponseEntity
        +approveSeller(UUID) ResponseEntity
        +rejectSeller(UUID) ResponseEntity
    }

    class AuthService {
        +register(RegisterRequest) JwtResponse
        +login(LoginRequest) JwtResponse
        +refresh(String) JwtResponse
    }

    class AdminSellerService {
        +listSellers(SellerStatus) List~User~
        +approveSeller(UUID) void
        +rejectSeller(UUID) void
    }

    class JwtService {
        +generateAccessToken(User) String
        +validateToken(String) Claims
        +extractUserId(String) UUID
    }

    class UserRepository {
        <<interface>>
        +findByEmail(String) Optional~User~
        +existsByEmail(String) boolean
        +findByRole(Role) List~User~
        +findByRoleAndSellerStatus(Role, SellerStatus) List~User~
    }

    class RefreshTokenRepository {
        <<interface>>
        +findByToken(String) Optional~RefreshToken~
    }

    class RefreshToken {
        +UUID id
        +String token
        +User user
        +LocalDateTime expiresAt
        +boolean revoked
    }

    AuthController "1" --> "1" AuthService
    AdminSellerController "1" --> "1" AdminSellerService
    AuthService "1" --> "1" JwtService
    AuthService "1" --> "1" UserRepository
    AuthService "1" --> "1" RefreshTokenRepository
    AdminSellerService "1" --> "1" UserRepository
    UserRepository "1" ..> "0..*" User
    RefreshTokenRepository "1" ..> "0..*" RefreshToken
    User --> Role
    User --> SellerStatus
    RefreshToken --> User
```
