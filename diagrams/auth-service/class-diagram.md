# Auth Service — Class Diagram

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
        +String passwordHash
        +Role role
        +UUID tenantId
        +boolean emailVerified
        +LocalDateTime emailVerifiedAt
        +LocalDateTime createdAt
    }

    class Role {
        <<enumeration>>
        BUYER
        SELLER
        ADMIN
    }

    class RefreshToken {
        +UUID id
        +String token
        +User user
        +LocalDateTime expiresAt
        +boolean revoked
    }

    class EmailVerificationCode {
        +UUID id
        +User user
        +String code
        +LocalDateTime expiresAt
        +boolean consumed
        +LocalDateTime createdAt
    }

    class AuthController {
        +register(RegisterRequest) ResponseEntity~RegisterResponse~
        +verifyEmail(VerifyEmailRequest) ResponseEntity
        +resendVerification(ResendVerificationRequest) ResponseEntity
        +login(LoginRequest) ResponseEntity~JwtResponse~
        +refresh(RefreshRequest) ResponseEntity~JwtResponse~
    }

    class InternalAuthController {
        +getUserByEmail(String) ResponseEntity~InternalUserContextResponse~
    }

    class InternalUserController {
        +getUserEmail(UUID) ResponseEntity
    }

    class AuthService {
        +register(RegisterRequest) RegisterResponse
        +verifyEmail(VerifyEmailRequest) void
        +resendVerification(String) void
        +login(LoginRequest) JwtResponse
        +refresh(String) JwtResponse
        +getUserContextByEmail(String) InternalUserContextResponse
    }

    class JwtService {
        +generateAccessToken(User) String
        +validateToken(String) Claims
        +extractUserId(String) UUID
    }

    class SellerClient {
        +getSellerStatus(UUID) String
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

    class EmailVerificationCodeRepository {
        <<interface>>
        +findTopByUserAndConsumedFalseOrderByCreatedAtDesc(User) Optional~EmailVerificationCode~
        +deleteByUser(User) void
    }

    AuthController "1" --> "1" AuthService
    InternalAuthController "1" --> "1" AuthService
    InternalUserController "1" --> "1" UserRepository
    AuthService "1" --> "1" JwtService
    AuthService "1" --> "1" UserRepository
    AuthService "1" --> "1" RefreshTokenRepository
    AuthService "1" --> "1" EmailVerificationCodeRepository
    AuthService "1" --> "1" SellerClient
    UserRepository "1" ..> "0..*" User
    RefreshTokenRepository "1" ..> "0..*" RefreshToken
    EmailVerificationCodeRepository "1" ..> "0..*" EmailVerificationCode
    User --> Role
    RefreshToken --> User
    EmailVerificationCode --> User
```
