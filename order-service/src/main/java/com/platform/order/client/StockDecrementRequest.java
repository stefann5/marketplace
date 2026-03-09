package com.platform.order.client;

import java.util.UUID;

public record StockDecrementRequest(UUID productId, int quantity) {}
