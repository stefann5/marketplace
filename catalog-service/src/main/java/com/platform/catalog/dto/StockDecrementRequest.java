package com.platform.catalog.dto;

import java.util.UUID;

public record StockDecrementRequest(UUID productId, int quantity) {}
