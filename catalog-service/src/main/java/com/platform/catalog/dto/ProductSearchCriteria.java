package com.platform.catalog.dto;

import java.math.BigDecimal;

public record ProductSearchCriteria(
        String name,
        Long categoryId,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        Double minRating,
        String sortBy,
        String sortDirection
) {}
