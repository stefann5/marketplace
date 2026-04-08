package com.platform.analytics.controller;

import com.platform.analytics.dto.TopCategoryResponse;
import com.platform.analytics.service.CategoryAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analytics/categories")
@RequiredArgsConstructor
public class CategoryAnalyticsController {

    private final CategoryAnalyticsService categoryAnalyticsService;

    @GetMapping("/top")
    public ResponseEntity<List<TopCategoryResponse>> getTopCategories(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(categoryAnalyticsService.getTopCategories(limit));
    }
}
