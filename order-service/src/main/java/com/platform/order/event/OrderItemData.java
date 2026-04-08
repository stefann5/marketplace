package com.platform.order.event;

import java.math.BigDecimal;

public record OrderItemData(
        String productId,
        int quantity,
        BigDecimal unitPrice,
        Long categoryId
) {}
