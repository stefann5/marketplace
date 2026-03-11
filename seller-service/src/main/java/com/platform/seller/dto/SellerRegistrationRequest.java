package com.platform.seller.dto;

import jakarta.validation.constraints.NotBlank;

public record SellerRegistrationRequest(
        @NotBlank String companyName,
        String description,
        String contactPhone,
        @NotBlank String contactEmail,
        String contactAddress
) {}
