package com.platform.order.service;

import com.platform.order.dto.AddItemRequest;
import com.platform.order.dto.CartResponse;
import com.platform.order.entity.Cart;
import com.platform.order.entity.CartItem;
import com.platform.order.exception.OrderException;
import com.platform.order.repository.CartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;

    @Transactional(readOnly = true)
    public CartResponse getCart(UUID userId) {
        Cart cart = getOrCreateCart(userId);
        return CartResponse.from(cart);
    }

    @Transactional
    public CartResponse addItem(UUID userId, AddItemRequest request) {
        Cart cart = getOrCreateCart(userId);

        cart.getItems().stream()
                .filter(ci -> ci.getProductId().equals(request.productId()))
                .findFirst()
                .ifPresentOrElse(
                        existing -> {
                            existing.setQuantity(existing.getQuantity() + request.quantity());
                            existing.setUnitPrice(request.unitPrice());
                        },
                        () -> {
                            CartItem item = new CartItem();
                            item.setCart(cart);
                            item.setProductId(request.productId());
                            item.setTenantId(request.tenantId());
                            item.setQuantity(request.quantity());
                            item.setUnitPrice(request.unitPrice());
                            item.setCategoryId(request.categoryId());
                            cart.getItems().add(item);
                        }
                );

        cartRepository.save(cart);
        return CartResponse.from(cart);
    }

    @Transactional
    public CartResponse updateItem(UUID userId, UUID itemId, int quantity) {
        Cart cart = getExistingCart(userId);

        CartItem item = cart.getItems().stream()
                .filter(ci -> ci.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new OrderException("Cart item not found", HttpStatus.NOT_FOUND));

        item.setQuantity(quantity);
        cartRepository.save(cart);
        return CartResponse.from(cart);
    }

    @Transactional
    public CartResponse removeItem(UUID userId, UUID itemId) {
        Cart cart = getExistingCart(userId);
        boolean removed = cart.getItems().removeIf(ci -> ci.getId().equals(itemId));
        if (!removed) throw new OrderException("Cart item not found", HttpStatus.NOT_FOUND);
        cartRepository.save(cart);
        return CartResponse.from(cart);
    }

    @Transactional
    public void clearCart(UUID userId) {
        cartRepository.findByUserId(userId).ifPresent(cart -> {
            cart.getItems().clear();
            cartRepository.save(cart);
        });
    }

    Cart getOrCreateCart(UUID userId) {
        return cartRepository.findByUserId(userId).orElseGet(() -> {
            Cart cart = new Cart();
            cart.setUserId(userId);
            return cartRepository.save(cart);
        });
    }

    private Cart getExistingCart(UUID userId) {
        return cartRepository.findByUserId(userId)
                .orElseThrow(() -> new OrderException("Cart not found", HttpStatus.NOT_FOUND));
    }
}
