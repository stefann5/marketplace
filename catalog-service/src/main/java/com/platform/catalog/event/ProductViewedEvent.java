package com.platform.catalog.event;

import java.time.Instant;

public record ProductViewedEvent(
        String tenantId,
        String productId,
        String productName,
        String categoryId,
        Instant timestamp
) {}
