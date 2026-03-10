package com.platform.catalog.dto;

import com.platform.catalog.entity.Review;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReviewResponse(
        UUID id,
        UUID productId,
        UUID userId,
        String buyerName,
        int rating,
        String comment,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ReviewResponse from(Review r) {
        return new ReviewResponse(
                r.getId(),
                r.getProductId(),
                r.getUserId(),
                obfuscateEmail(r.getBuyerName()),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }

    private static String obfuscateEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String domain = parts[1];
        String maskedLocal = local.length() <= 2 ? local.charAt(0) + "***" : local.substring(0, 2) + "***";
        int dotIndex = domain.lastIndexOf('.');
        if (dotIndex <= 0) return maskedLocal + "@***";
        String tld = domain.substring(dotIndex);
        return maskedLocal + "@***" + tld;
    }
}
