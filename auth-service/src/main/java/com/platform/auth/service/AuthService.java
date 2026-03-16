package com.platform.auth.service;

import com.platform.auth.dto.JwtResponse;
import com.platform.auth.dto.LoginRequest;
import com.platform.auth.dto.RegisterResponse;
import com.platform.auth.dto.RegisterRequest;
import com.platform.auth.dto.VerifyEmailRequest;
import com.platform.auth.dto.InternalUserContextResponse;
import com.platform.auth.entity.EmailVerificationCode;
import com.platform.auth.entity.RefreshToken;
import com.platform.auth.entity.User;
import com.platform.auth.enums.Role;
import com.platform.auth.exception.AuthException;
import com.platform.auth.repository.EmailVerificationCodeRepository;
import com.platform.auth.repository.RefreshTokenRepository;
import com.platform.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationCodeRepository emailVerificationCodeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final SellerClient sellerClient;

    @Value("${jwt.refresh-expiry-ms}")
    private long refreshExpiryMs;

    @Value("${verification.code-expiry-minutes}")
    private long verificationCodeExpiryMinutes;

    @Value("${mail.from}")
    private String mailFrom;

    private static final Random RANDOM = new Random();

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
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
        user.setEmailVerified(false);

        userRepository.save(user);
        issueVerificationCode(user);
        return new RegisterResponse("Verification code sent to your email", true);
    }

    @Transactional
    public void verifyEmail(VerifyEmailRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new AuthException("Account not found", HttpStatus.NOT_FOUND));

        if (user.isEmailVerified()) {
            return;
        }

        EmailVerificationCode code = emailVerificationCodeRepository
                .findTopByUserAndConsumedFalseOrderByCreatedAtDesc(user)
                .orElseThrow(() -> new AuthException("Verification code not found", HttpStatus.BAD_REQUEST));

        if (code.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new AuthException("Verification code expired", HttpStatus.BAD_REQUEST);
        }

        if (!code.getCode().equals(request.code().trim())) {
            throw new AuthException("Invalid verification code", HttpStatus.BAD_REQUEST);
        }

        code.setConsumed(true);
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        emailVerificationCodeRepository.save(code);
        userRepository.save(user);
    }

    @Transactional
    public void resendVerification(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthException("Account not found", HttpStatus.NOT_FOUND));
        if (user.isEmailVerified()) {
            throw new AuthException("Email already verified", HttpStatus.BAD_REQUEST);
        }
        issueVerificationCode(user);
    }

    @Transactional
    public JwtResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new AuthException("Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AuthException("Invalid credentials");
        }

        if (!user.isEmailVerified()) {
            throw new AuthException("Please verify your email first", HttpStatus.FORBIDDEN);
        }

        if (user.getRole() == Role.SELLER) {
            String status = sellerClient.getSellerStatus(user.getId());
            switch (status) {
                case "NOT_REGISTERED" -> throw new AuthException("Please complete your seller onboarding", HttpStatus.FORBIDDEN);
                case "PENDING_APPROVAL" -> throw new AuthException("Your seller account is pending admin approval", HttpStatus.FORBIDDEN);
                case "REJECTED" -> throw new AuthException("Your seller account has been rejected", HttpStatus.FORBIDDEN);
                case "SUSPENDED" -> throw new AuthException("Your seller account has been suspended", HttpStatus.FORBIDDEN);
                case "ACTIVE" -> {}
                default -> throw new AuthException("Seller status invalid", HttpStatus.FORBIDDEN);
            }
            if (!"ACTIVE".equals(status)) {
                throw new AuthException("Seller account is not active", HttpStatus.FORBIDDEN);
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
        validateUserCanAuthenticate(user);
        refreshTokenRepository.delete(stored);
        return issueTokenPair(user);
    }

    @Transactional(readOnly = true)
    public InternalUserContextResponse getUserContextByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthException("Account not found", HttpStatus.NOT_FOUND));
        return new InternalUserContextResponse(user.getId(), user.getTenantId(), user.getRole(), user.isEmailVerified());
    }

    private JwtResponse issueTokenPair(User user) {
        validateUserCanAuthenticate(user);
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

    private void validateUserCanAuthenticate(User user) {
        if (!user.isEmailVerified()) {
            throw new AuthException("Please verify your email first", HttpStatus.FORBIDDEN);
        }
        if (user.getRole() == Role.SELLER) {
            String status = sellerClient.getSellerStatus(user.getId());
            if (!"ACTIVE".equals(status)) {
                throw new AuthException("Seller account is not active", HttpStatus.FORBIDDEN);
            }
        }
    }

    private void issueVerificationCode(User user) {
        emailVerificationCodeRepository.deleteByUser(user);

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        EmailVerificationCode verificationCode = new EmailVerificationCode();
        verificationCode.setUser(user);
        verificationCode.setCode(code);
        verificationCode.setExpiresAt(LocalDateTime.now().plusMinutes(verificationCodeExpiryMinutes));
        emailVerificationCodeRepository.save(verificationCode);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject("Marketplace verification code");
        message.setText("Your verification code is: " + code + "\n\nThis code expires in " + verificationCodeExpiryMinutes + " minutes.");
        mailSender.send(message);
    }
}
