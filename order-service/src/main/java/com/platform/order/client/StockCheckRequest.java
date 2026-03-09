package com.platform.order.client;

import java.util.UUID;

public record StockCheckRequest(UUID productId, int requestedQuantity) {}
