package com.platform.analytics.dto;

import java.math.BigDecimal;

public record RevenueSummaryResponse(
        BigDecimal totalRevenue,
        BigDecimal todayRevenue,
        BigDecimal weekRevenue,
        BigDecimal monthRevenue,
        BigDecimal yearRevenue,
        double monthOverMonthChange
) {}
