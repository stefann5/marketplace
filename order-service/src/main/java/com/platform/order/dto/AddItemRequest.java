package com.platform.order.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record AddItemRequest(
        @NotNull UUID productId,
        @NotNull UUID tenantId,
        @Positive int quantity,
        @NotNull @Positive BigDecimal unitPrice
) {}
