package com.platform.order.event;

import java.time.Instant;

public record OrderFulfilledEvent(
        String tenantId,
        String orderId,
        Instant timestamp
) {}
