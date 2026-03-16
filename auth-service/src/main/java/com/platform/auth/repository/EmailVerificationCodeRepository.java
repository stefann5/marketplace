package com.platform.auth.repository;

import com.platform.auth.entity.EmailVerificationCode;
import com.platform.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationCodeRepository extends JpaRepository<EmailVerificationCode, UUID> {
    Optional<EmailVerificationCode> findTopByUserAndConsumedFalseOrderByCreatedAtDesc(User user);
    void deleteByUser(User user);
}
