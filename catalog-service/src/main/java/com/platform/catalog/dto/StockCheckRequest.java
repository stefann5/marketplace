package com.platform.catalog.dto;

import java.util.UUID;

public record StockCheckRequest(UUID productId, int requestedQuantity) {}
