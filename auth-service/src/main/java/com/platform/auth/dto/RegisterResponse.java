package com.platform.auth.dto;

public record RegisterResponse(
        String message,
        boolean verificationRequired
) {}
