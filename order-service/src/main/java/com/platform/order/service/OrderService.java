package com.platform.order.service;

import com.platform.order.dto.OrderResponse;
import com.platform.order.entity.Order;
import com.platform.order.enums.OrderStatus;
import com.platform.order.event.EventPublisher;
import com.platform.order.event.OrderFulfilledEvent;
import com.platform.order.exception.OrderException;
import com.platform.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final EventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<OrderResponse> getBuyerOrders(UUID userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(OrderResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getSellerOrders(UUID tenantId, OrderStatus status) {
        List<Order> orders;
        if (status != null) {
            orders = orderRepository.findByTenantIdAndStatusOrderByCreatedAtDesc(tenantId, status);
        } else {
            orders = orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        }
        return orders.stream().map(OrderResponse::from).toList();
    }

    @Transactional
    public OrderResponse fulfillOrder(UUID tenantId, UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderException("Order not found", HttpStatus.NOT_FOUND));

        if (!order.getTenantId().equals(tenantId)) {
            throw new OrderException("Order not found", HttpStatus.NOT_FOUND);
        }

        if (order.getStatus() == OrderStatus.FULFILLED) {
            throw new OrderException("Order already fulfilled", HttpStatus.BAD_REQUEST);
        }

        order.setStatus(OrderStatus.FULFILLED);
        orderRepository.save(order);

        eventPublisher.publishOrderFulfilled(new OrderFulfilledEvent(
                order.getTenantId().toString(),
                order.getId().toString(),
                Instant.now()));

        return OrderResponse.from(order);
    }

    @Transactional(readOnly = true)
    public boolean hasUserPurchasedProduct(UUID userId, UUID productId) {
        return orderRepository.existsByUserIdAndProductId(userId, productId);
    }
}
