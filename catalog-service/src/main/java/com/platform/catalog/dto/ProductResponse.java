package com.platform.catalog.dto;

import com.platform.catalog.entity.Product;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record ProductResponse(
        UUID id,
        UUID tenantId,
        String name,
        String description,
        BigDecimal price,
        int stock,
        UUID categoryId,
        String imageUrl,
        double averageRating,
        int reviewCount,
        int purchaseCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(
                p.getId(),
                p.getTenantId(),
                p.getName(),
                p.getDescription(),
                p.getPrice(),
                p.getStock(),
                p.getCategoryId(),
                p.getImageUrl(),
                p.getAverageRating(),
                p.getReviewCount(),
                p.getPurchaseCount(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
