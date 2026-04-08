package com.platform.order.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderPlacedEvent(
        String tenantId,
        String orderId,
        String userId,
        BigDecimal total,
        List<OrderItemData> items,
        Instant timestamp
) {}
