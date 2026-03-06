package com.platform.auth.dto;

import com.platform.auth.enums.SellerStatus;

public record JwtResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        SellerStatus sellerStatus
) {
    public static JwtResponse of(String accessToken, String refreshToken, SellerStatus sellerStatus) {
        return new JwtResponse(accessToken, refreshToken, "Bearer", sellerStatus);
    }
}
