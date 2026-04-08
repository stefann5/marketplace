package com.platform.analytics.controller;

import com.platform.analytics.dto.*;
import com.platform.analytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/revenue")
    public ResponseEntity<RevenueSummaryResponse> getRevenue(
            @RequestHeader("X-Tenant-Id") String tenantId) {
        return ResponseEntity.ok(analyticsService.getRevenueSummary(tenantId));
    }

    @GetMapping("/revenue/chart")
    public ResponseEntity<RevenueChartResponse> getRevenueChart(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(analyticsService.getRevenueChart(tenantId, period));
    }

    @GetMapping("/orders")
    public ResponseEntity<OrderSummaryResponse> getOrders(
            @RequestHeader("X-Tenant-Id") String tenantId) {
        return ResponseEntity.ok(analyticsService.getOrderSummary(tenantId));
    }

    @GetMapping("/products/top")
    public ResponseEntity<List<TopProductResponse>> getTopProducts(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @RequestParam(defaultValue = "revenue") String sortBy,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(analyticsService.getTopProducts(tenantId, sortBy, limit));
    }

    @GetMapping("/products/views")
    public ResponseEntity<List<ProductViewResponse>> getProductViews(
            @RequestHeader("X-Tenant-Id") String tenantId) {
        return ResponseEntity.ok(analyticsService.getProductViews(tenantId));
    }

    @GetMapping("/customers/search-terms")
    public ResponseEntity<List<SearchTermResponse>> getSearchTerms(
            @RequestHeader("X-Tenant-Id") String tenantId) {
        return ResponseEntity.ok(analyticsService.getSearchTerms());
    }
}
