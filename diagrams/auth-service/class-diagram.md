# Auth Service — Class Diagram

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
        +register(RegisterRequest) JwtResponse
        +login(LoginRequest) JwtResponse
        +refresh(String) JwtResponse
    }

    class SellerClient {
        +getSellerStatus(UUID) String
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
    AuthService "1" --> "1" JwtService
    AuthService "1" --> "1" UserRepository
    AuthService "1" --> "1" RefreshTokenRepository
    AuthService "1" --> "1" SellerClient
    UserRepository "1" ..> "0..*" User
    RefreshTokenRepository "1" ..> "0..*" RefreshToken
    User --> Role
    RefreshToken --> User
```
