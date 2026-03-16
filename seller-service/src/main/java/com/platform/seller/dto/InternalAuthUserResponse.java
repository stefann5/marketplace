package com.platform.seller.dto;

import java.util.UUID;

public record InternalAuthUserResponse(
        UUID userId,
        UUID tenantId,
        String role,
        boolean emailVerified
) {}
