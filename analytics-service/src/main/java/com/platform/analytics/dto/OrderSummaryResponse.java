package com.platform.analytics.dto;

import java.util.List;

public record OrderSummaryResponse(
        long totalOrders,
        long fulfilledOrders,
        long unfulfilledOrders,
        List<String> trendLabels,
        List<Long> trendValues
) {}
