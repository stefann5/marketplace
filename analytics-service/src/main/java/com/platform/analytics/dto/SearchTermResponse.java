package com.platform.analytics.dto;

public record SearchTermResponse(
        String term,
        long count
) {}
