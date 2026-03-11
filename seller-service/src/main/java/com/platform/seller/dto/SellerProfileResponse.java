package com.platform.seller.dto;

import com.platform.seller.enums.SellerStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record SellerProfileResponse(
        UUID id,
        UUID userId,
        UUID tenantId,
        String companyName,
        String description,
        String slug,
        String contactPhone,
        String contactEmail,
        String contactAddress,
        String logoUrl,
        SellerStatus status,
        LocalDateTime createdAt,
        List<DocumentResponse> documents,
        ThemeResponse theme
) {

    public record DocumentResponse(
            UUID id,
            String fileName,
            String contentType,
            String downloadUrl,
            LocalDateTime uploadedAt
    ) {}

    public record ThemeResponse(
            String preset,
            String primaryColor,
            String fontFamily,
            String borderRadius,
            String bannerUrl,
            String logoUrl
    ) {}
}
