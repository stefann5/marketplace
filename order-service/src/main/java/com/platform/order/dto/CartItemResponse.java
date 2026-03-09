package com.platform.order.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CartItemResponse(UUID id, UUID productId, UUID tenantId, int quantity, BigDecimal unitPrice) {}
