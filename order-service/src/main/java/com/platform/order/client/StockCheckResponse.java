package com.platform.order.client;

import java.util.UUID;

public record StockCheckResponse(UUID productId, int availableStock, boolean sufficient) {}
