package com.platform.order.dto;

import com.platform.order.entity.Cart;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record CartResponse(UUID id, UUID userId, List<CartItemResponse> items, LocalDateTime updatedAt) {

    public static CartResponse from(Cart cart) {
        List<CartItemResponse> items = cart.getItems().stream()
                .map(ci -> new CartItemResponse(ci.getId(), ci.getProductId(), ci.getTenantId(), ci.getQuantity(), ci.getUnitPrice()))
                .toList();
        return new CartResponse(cart.getId(), cart.getUserId(), items, cart.getUpdatedAt());
    }
}
