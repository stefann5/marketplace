package com.platform.order.dto;

import com.platform.order.entity.Order;
import com.platform.order.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrderResponse(UUID id, UUID tenantId, OrderStatus status, BigDecimal total,
                             List<OrderItemResponse> items, LocalDateTime createdAt) {

    public static OrderResponse from(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(oi -> new OrderItemResponse(oi.getId(), oi.getProductId(), oi.getQuantity(), oi.getUnitPrice()))
                .toList();
        return new OrderResponse(order.getId(), order.getTenantId(), order.getStatus(), order.getTotal(), items, order.getCreatedAt());
    }
}
