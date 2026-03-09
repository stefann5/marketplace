package com.platform.order.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class RoleFilter extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.startsWith("/internal/")) return true;
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();
        String userId = request.getHeader("X-User-Id");

        if (path.startsWith("/api/cart") || path.equals("/api/orders/checkout")) {
            if (userId == null || userId.isBlank()) {
                sendForbidden(response);
                return;
            }
        }

        if ((path.startsWith("/api/orders/seller") || (method.equals("PATCH") && path.contains("/fulfill")))) {
            String role = request.getHeader("X-User-Role");
            String tenantId = request.getHeader("X-Tenant-Id");
            if (!"SELLER".equals(role) || tenantId == null || tenantId.isBlank()) {
                sendForbidden(response);
                return;
            }
        }

        if (path.equals("/api/orders") && "GET".equals(method)) {
            if (userId == null || userId.isBlank()) {
                sendForbidden(response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private void sendForbidden(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Forbidden\"}");
    }
}
