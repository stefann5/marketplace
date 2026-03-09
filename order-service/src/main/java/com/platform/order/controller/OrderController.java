package com.platform.order.controller;

import com.platform.order.dto.OrderResponse;
import com.platform.order.enums.OrderStatus;
import com.platform.order.service.CheckoutService;
import com.platform.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final CheckoutService checkoutService;
    private final OrderService orderService;

    @PostMapping("/checkout")
    public ResponseEntity<List<OrderResponse>> checkout(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(checkoutService.checkout(userId));
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getBuyerOrders(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(orderService.getBuyerOrders(userId));
    }

    @GetMapping("/seller")
    public ResponseEntity<List<OrderResponse>> getSellerOrders(
            @RequestHeader("X-Tenant-Id") UUID tenantId,
            @RequestParam(required = false) OrderStatus status) {
        return ResponseEntity.ok(orderService.getSellerOrders(tenantId, status));
    }

    @PatchMapping("/{orderId}/fulfill")
    public ResponseEntity<OrderResponse> fulfillOrder(
            @RequestHeader("X-Tenant-Id") UUID tenantId,
            @PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.fulfillOrder(tenantId, orderId));
    }

    @GetMapping("/check-purchase")
    public ResponseEntity<Map<String, Boolean>> checkPurchase(
            @RequestParam UUID userId,
            @RequestParam UUID productId) {
        boolean purchased = orderService.hasUserPurchasedProduct(userId, productId);
        return ResponseEntity.ok(Map.of("purchased", purchased));
    }
}
