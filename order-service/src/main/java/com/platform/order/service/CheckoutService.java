package com.platform.order.service;

import com.platform.order.client.CatalogClient;
import com.platform.order.client.StockCheckRequest;
import com.platform.order.client.StockCheckResponse;
import com.platform.order.client.StockDecrementRequest;
import com.platform.order.dto.OrderResponse;
import com.platform.order.entity.Cart;
import com.platform.order.entity.CartItem;
import com.platform.order.entity.Order;
import com.platform.order.entity.OrderItem;
import com.platform.order.enums.OrderStatus;
import com.platform.order.exception.OrderException;
import com.platform.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CheckoutService {

    private final CartService cartService;
    private final CatalogClient catalogClient;
    private final OrderRepository orderRepository;

    @Transactional
    public List<OrderResponse> checkout(UUID userId) {
        Cart cart = cartService.getOrCreateCart(userId);

        if (cart.getItems().isEmpty()) {
            throw new OrderException("Cart is empty", HttpStatus.BAD_REQUEST);
        }

        validateStock(cart.getItems());

        Map<UUID, List<CartItem>> byTenant = cart.getItems().stream()
                .collect(Collectors.groupingBy(CartItem::getTenantId));

        decrementStock(cart.getItems());

        List<Order> orders = new ArrayList<>();
        for (Map.Entry<UUID, List<CartItem>> entry : byTenant.entrySet()) {
            Order order = createOrder(userId, entry.getKey(), entry.getValue());
            orders.add(order);
        }

        List<Order> savedOrders = orderRepository.saveAll(orders);
        cartService.clearCart(userId);

        return savedOrders.stream().map(OrderResponse::from).toList();
    }

    private void validateStock(List<CartItem> items) {
        List<StockCheckRequest> requests = items.stream()
                .map(ci -> new StockCheckRequest(ci.getProductId(), ci.getQuantity()))
                .toList();

        List<StockCheckResponse> responses = catalogClient.checkStock(requests);

        List<UUID> insufficientProducts = responses.stream()
                .filter(r -> !r.sufficient())
                .map(StockCheckResponse::productId)
                .toList();

        if (!insufficientProducts.isEmpty()) {
            throw new OrderException("Insufficient stock for products: " + insufficientProducts, HttpStatus.CONFLICT);
        }
    }

    private void decrementStock(List<CartItem> items) {
        List<StockDecrementRequest> requests = items.stream()
                .map(ci -> new StockDecrementRequest(ci.getProductId(), ci.getQuantity()))
                .toList();
        catalogClient.decrementStock(requests);
    }

    private Order createOrder(UUID userId, UUID tenantId, List<CartItem> items) {
        Order order = new Order();
        order.setUserId(userId);
        order.setTenantId(tenantId);
        order.setStatus(OrderStatus.PURCHASED);

        BigDecimal total = BigDecimal.ZERO;
        for (CartItem ci : items) {
            OrderItem oi = new OrderItem();
            oi.setOrder(order);
            oi.setProductId(ci.getProductId());
            oi.setQuantity(ci.getQuantity());
            oi.setUnitPrice(ci.getUnitPrice());
            order.getItems().add(oi);
            total = total.add(ci.getUnitPrice().multiply(BigDecimal.valueOf(ci.getQuantity())));
        }
        order.setTotal(total);
        return order;
    }
}
