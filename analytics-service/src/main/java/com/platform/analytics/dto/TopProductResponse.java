package com.platform.analytics.dto;

import java.math.BigDecimal;

public record TopProductResponse(
        String productId,
        long unitsSold,
        BigDecimal revenue
) {}
