package com.platform.seller.dto;

import jakarta.validation.constraints.NotBlank;

public record ThemeRequest(
        @NotBlank String preset
) {}
