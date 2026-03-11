package com.platform.seller.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

public class SellerRoleFilter extends OncePerRequestFilter {

    private static final Set<String> SELLER_PATHS = Set.of(
            "/api/sellers/register",
            "/api/sellers/me"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String method = request.getMethod();
        if (uri.startsWith("/api/admin") || uri.startsWith("/internal")) return true;
        if ("GET".equals(method) && !uri.equals("/api/sellers/me")) return true;
        return SELLER_PATHS.stream().noneMatch(uri::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String role = request.getHeader("X-User-Role");
        if (!"SELLER".equals(role)) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Forbidden\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
