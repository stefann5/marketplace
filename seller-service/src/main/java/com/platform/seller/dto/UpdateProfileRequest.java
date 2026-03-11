package com.platform.seller.dto;

public record UpdateProfileRequest(
        String companyName,
        String description,
        String contactPhone,
        String contactEmail,
        String contactAddress
) {}
