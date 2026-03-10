package com.platform.catalog.controller;

import com.platform.catalog.dto.ReviewRequest;
import com.platform.catalog.dto.ReviewResponse;
import com.platform.catalog.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping("/{productId}")
    public ResponseEntity<Page<ReviewResponse>> getReviews(
            @PathVariable UUID productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(reviewService.getReviews(productId, PageRequest.of(page, size)));
    }

    @GetMapping("/{productId}/mine")
    public ResponseEntity<ReviewResponse> getMyReview(
            @PathVariable UUID productId,
            @RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(reviewService.getUserReview(productId, userId));
    }

    @PostMapping("/{productId}")
    public ResponseEntity<ReviewResponse> createReview(
            @PathVariable UUID productId,
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.createReview(productId, userId, request));
    }

    @PutMapping("/{reviewId}")
    public ResponseEntity<ReviewResponse> updateReview(
            @PathVariable UUID reviewId,
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(reviewService.updateReview(reviewId, userId, request));
    }
}
