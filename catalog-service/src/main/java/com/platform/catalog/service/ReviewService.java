package com.platform.catalog.service;

import com.platform.catalog.client.AuthClient;
import com.platform.catalog.client.OrderClient;
import com.platform.catalog.dto.ReviewRequest;
import com.platform.catalog.dto.ReviewResponse;
import com.platform.catalog.entity.Product;
import com.platform.catalog.entity.Review;
import com.platform.catalog.exception.CatalogException;
import com.platform.catalog.repository.ProductRepository;
import com.platform.catalog.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final OrderClient orderClient;
    private final AuthClient authClient;

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getReviews(UUID productId, Pageable pageable) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId, pageable)
                .map(ReviewResponse::from);
    }

    @Transactional(readOnly = true)
    public ReviewResponse getUserReview(UUID productId, UUID userId) {
        return reviewRepository.findByProductIdAndUserId(productId, userId)
                .map(ReviewResponse::from)
                .orElseThrow(() -> new CatalogException("Review not found", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public ReviewResponse createReview(UUID productId, UUID userId, ReviewRequest request) {
        productRepository.findById(productId)
                .orElseThrow(() -> new CatalogException("Product not found", HttpStatus.NOT_FOUND));

        if (!orderClient.hasUserPurchasedProduct(userId, productId)) {
            throw new CatalogException("You must purchase this product before reviewing", HttpStatus.FORBIDDEN);
        }

        if (reviewRepository.findByProductIdAndUserId(productId, userId).isPresent()) {
            throw new CatalogException("You have already reviewed this product", HttpStatus.CONFLICT);
        }

        String email = authClient.getUserEmail(userId);
        if (email == null) {
            throw new CatalogException("User not found", HttpStatus.NOT_FOUND);
        }

        Review review = new Review();
        review.setProductId(productId);
        review.setUserId(userId);
        review.setBuyerName(email);
        review.setRating(request.rating());
        review.setComment(request.comment());
        reviewRepository.save(review);

        updateProductRating(productId);
        return ReviewResponse.from(review);
    }

    @Transactional
    public ReviewResponse updateReview(UUID reviewId, UUID userId, ReviewRequest request) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new CatalogException("Review not found", HttpStatus.NOT_FOUND));

        if (!review.getUserId().equals(userId)) {
            throw new CatalogException("You can only edit your own review", HttpStatus.FORBIDDEN);
        }

        review.setRating(request.rating());
        review.setComment(request.comment());
        reviewRepository.save(review);

        updateProductRating(review.getProductId());
        return ReviewResponse.from(review);
    }

    private void updateProductRating(UUID productId) {
        Page<Review> allReviews = reviewRepository.findByProductIdOrderByCreatedAtDesc(
                productId, Pageable.unpaged());

        int count = (int) allReviews.getTotalElements();
        double avg = allReviews.getContent().stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0.0);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new CatalogException("Product not found", HttpStatus.NOT_FOUND));
        product.setReviewCount(count);
        product.setAverageRating(Math.round(avg * 10.0) / 10.0);
        productRepository.save(product);
    }
}
