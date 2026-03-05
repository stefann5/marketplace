package com.platform.auth.service;

import com.platform.auth.dto.JwtResponse;
import com.platform.auth.dto.LoginRequest;
import com.platform.auth.dto.RegisterRequest;
import com.platform.auth.entity.RefreshToken;
import com.platform.auth.entity.User;
import com.platform.auth.enums.Role;
import com.platform.auth.enums.SellerStatus;
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

    @Value("${jwt.refresh-expiry-ms}")
    private long refreshExpiryMs;

    @Transactional
    public JwtResponse register(RegisterRequest request) {
        if (request.role() == Role.ADMIN) {
            throw new AuthException("Cannot self-register as ADMIN", HttpStatus.FORBIDDEN);
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
            user.setSellerStatus(SellerStatus.PENDING);
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

        return JwtResponse.of(accessToken, refreshToken.getToken(), user.getSellerStatus());
    }
}
