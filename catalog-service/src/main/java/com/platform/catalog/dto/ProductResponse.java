package com.platform.catalog.dto;

import com.platform.catalog.entity.Product;
import com.platform.catalog.entity.ProductImage;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ProductResponse(
        UUID id,
        UUID tenantId,
        String name,
        String description,
        BigDecimal price,
        int stock,
        UUID categoryId,
        List<String> imageUrls,
        double averageRating,
        int reviewCount,
        int purchaseCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ProductResponse from(Product p) {
        List<String> urls = p.getImages().stream()
                .map(ProductImage::getImageUrl)
                .toList();
        return new ProductResponse(
                p.getId(),
                p.getTenantId(),
                p.getName(),
                p.getDescription(),
                p.getPrice(),
                p.getStock(),
                p.getCategoryId(),
                urls,
                p.getAverageRating(),
                p.getReviewCount(),
                p.getPurchaseCount(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
