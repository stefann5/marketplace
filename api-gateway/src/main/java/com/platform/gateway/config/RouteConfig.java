package com.platform.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RouteConfig {

    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("auth-service", r -> r
                        .path("/api/auth/**")
                        .uri("http://auth-service:8081"))

                .route("catalog-service", r -> r
                        .path("/api/products/**", "/api/categories/**", "/api/reviews/**")
                        .uri("http://catalog-service:8082"))

                .route("order-service", r -> r
                        .path("/api/cart/**", "/api/orders/**")
                        .uri("http://order-service:8083"))

                .route("seller-service", r -> r
                        .path("/api/sellers/**", "/api/admin/sellers/**")
                        .uri("http://seller-service:8084"))

                .route("analytics-service", r -> r
                        .path("/api/analytics/**")
                        .uri("http://analytics-service:8085"))

                .route("ai-chat-service", r -> r
                        .path("/api/chat/**")
                        .uri("http://ai-chat-service:8086"))

                .build();
    }
}
