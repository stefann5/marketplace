package com.platform.analytics.dto;

import java.math.BigDecimal;

public record TopProductResponse(
        String productId,
        String productName,
        long unitsSold,
        BigDecimal revenue
) {}
