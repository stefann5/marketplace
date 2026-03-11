package com.platform.auth.dto;

public record JwtResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        String sellerStatus
) {
    public static JwtResponse of(String accessToken, String refreshToken, String sellerStatus) {
        return new JwtResponse(accessToken, refreshToken, "Bearer", sellerStatus);
    }
}
