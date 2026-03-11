package com.platform.auth.service;

import com.platform.auth.dto.JwtResponse;
import com.platform.auth.dto.LoginRequest;
import com.platform.auth.dto.RegisterRequest;
import com.platform.auth.entity.RefreshToken;
import com.platform.auth.entity.User;
import com.platform.auth.enums.Role;
import com.platform.auth.exception.AuthException;
import com.platform.auth.repository.RefreshTokenRepository;
import com.platform.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final SellerClient sellerClient;

    @Value("${jwt.refresh-expiry-ms}")
    private long refreshExpiryMs;

    @Transactional
    public JwtResponse register(RegisterRequest request) {
        if (request.role() == Role.ADMIN) {
            throw new AuthException("Cannot self-register as ADMIN", HttpStatus.FORBIDDEN);
        }
        if (!request.password().equals(request.confirmPassword())) {
            throw new AuthException("Passwords do not match", HttpStatus.BAD_REQUEST);
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new AuthException("Email already registered", HttpStatus.CONFLICT);
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());

        if (request.role() == Role.SELLER) {
            user.setTenantId(UUID.randomUUID());
        }

        userRepository.save(user);

        return issueTokenPair(user);
    }

    @Transactional
    public JwtResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new AuthException("Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AuthException("Invalid credentials");
        }

        if (user.getRole() == Role.SELLER) {
            String status = sellerClient.getSellerStatus(user.getId());
            switch (status) {
                case "NOT_REGISTERED" -> throw new AuthException("Please complete your seller onboarding", HttpStatus.FORBIDDEN);
                case "PENDING_APPROVAL" -> throw new AuthException("Your seller account is pending admin approval", HttpStatus.FORBIDDEN);
                case "REJECTED" -> throw new AuthException("Your seller account has been rejected", HttpStatus.FORBIDDEN);
                case "SUSPENDED" -> throw new AuthException("Your seller account has been suspended", HttpStatus.FORBIDDEN);
                default -> {}
            }
        }

        return issueTokenPair(user);
    }

    @Transactional
    public JwtResponse refresh(String refreshTokenValue) {
        RefreshToken stored = refreshTokenRepository.findByToken(refreshTokenValue)
                .orElseThrow(() -> new AuthException("Invalid refresh token"));

        if (stored.isRevoked() || stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new AuthException("Refresh token expired or revoked");
        }

        User user = stored.getUser();
        refreshTokenRepository.delete(stored);
        return issueTokenPair(user);
    }

    private JwtResponse issueTokenPair(User user) {
        String accessToken = jwtService.generateAccessToken(user);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setUser(user);
        refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(refreshExpiryMs / 1000));
        refreshTokenRepository.save(refreshToken);

        String sellerStatus = null;
        if (user.getRole() == Role.SELLER) {
            sellerStatus = sellerClient.getSellerStatus(user.getId());
        }

        return JwtResponse.of(accessToken, refreshToken.getToken(), sellerStatus);
    }
}
