package com.platform.analytics.dto;

import java.math.BigDecimal;

public record TopCategoryResponse(
        Long categoryId,
        long totalUnitsSold,
        BigDecimal totalRevenue
) {}
