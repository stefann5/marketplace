package com.platform.auth.dto;

import com.platform.auth.enums.Role;

import java.util.UUID;

public record InternalUserContextResponse(
        UUID userId,
        UUID tenantId,
        Role role,
        boolean emailVerified
) {}
