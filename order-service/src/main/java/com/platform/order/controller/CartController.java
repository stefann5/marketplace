package com.platform.order.controller;

import com.platform.order.dto.AddItemRequest;
import com.platform.order.dto.CartResponse;
import com.platform.order.dto.UpdateItemRequest;
import com.platform.order.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<CartResponse> getCart(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(cartService.getCart(userId));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponse> addItem(
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody AddItemRequest request) {
        return ResponseEntity.ok(cartService.addItem(userId, request));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<CartResponse> updateItem(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID itemId,
            @Valid @RequestBody UpdateItemRequest request) {
        return ResponseEntity.ok(cartService.updateItem(userId, itemId, request.quantity()));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<CartResponse> removeItem(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID itemId) {
        return ResponseEntity.ok(cartService.removeItem(userId, itemId));
    }
}
