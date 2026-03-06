package com.platform.catalog.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class SellerRoleFilter extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if (!path.startsWith("/api/products")) return true;

        if (path.equals("/api/products/seller") || path.startsWith("/api/products/seller?")) {
            return false;
        }

        return "GET".equalsIgnoreCase(method);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String role = request.getHeader("X-User-Role");
        String tenantId = request.getHeader("X-Tenant-Id");

        if (!"SELLER".equals(role) || tenantId == null || tenantId.isBlank()) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Forbidden\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
