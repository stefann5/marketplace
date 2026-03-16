package com.platform.catalog.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductSearchCriteria(
        String name,
        Long categoryId,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        Double minRating,
        UUID tenantId,
        String sortBy,
        String sortDirection
) {}
