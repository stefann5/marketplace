package com.platform.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final SecretKey key;

    private static final List<String> OPEN_PATHS = List.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh",
            "/api/auth/verify-email",
            "/api/auth/resend-verification",
            "/api/sellers/register-public"
    );

    private static final List<String> PUBLIC_GET_PATHS = List.of(
            "/api/products",
            "/api/reviews",
            "/api/categories",
            "/api/sellers",
            "/api/analytics/categories"
    );

    public JwtAuthenticationFilter(@Value("${jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        String method = exchange.getRequest().getMethod().name();

        if (isOpenPath(path)) {
            return chain.filter(exchange);
        }

        if ("GET".equals(method) && isPublicGetPath(path)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String userId = claims.get("userId", String.class);
            String role = claims.get("role", String.class);
            String tenantId = claims.get("tenantId", String.class);

            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                    .headers(headers -> headers.remove(HttpHeaders.AUTHORIZATION))
                    .header("X-User-Id", userId)
                    .header("X-User-Role", role)
                    .header("X-Tenant-Id", tenantId != null ? tenantId : "")
                    .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());

        } catch (Exception e) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }

    private boolean isOpenPath(String path) {
        return OPEN_PATHS.stream().anyMatch(path::startsWith);
    }

    private boolean isPublicGetPath(String path) {
        if (path.startsWith("/api/products/seller")) return false;
        if (path.startsWith("/api/sellers/theme")) return false;
        if (path.equals("/api/sellers/me")) return false;
        if (path.endsWith("/mine")) return false;
        return PUBLIC_GET_PATHS.stream().anyMatch(path::startsWith);
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
