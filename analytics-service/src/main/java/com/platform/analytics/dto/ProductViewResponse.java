package com.platform.analytics.dto;

public record ProductViewResponse(
        String productId,
        String productName,
        long viewCount
) {}
