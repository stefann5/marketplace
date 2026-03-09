package com.platform.catalog.dto;

import java.util.UUID;

public record StockCheckResponse(UUID productId, int availableStock, boolean sufficient) {}
