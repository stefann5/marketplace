package com.platform.catalog.client;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OrderClient {

    private final RestTemplate restTemplate;

    @Value("${order.service.url}")
    private String orderServiceUrl;

    public boolean hasUserPurchasedProduct(UUID userId, UUID productId) {
        ResponseEntity<Map<String, Boolean>> response = restTemplate.exchange(
                orderServiceUrl + "/api/orders/check-purchase?userId={userId}&productId={productId}",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {},
                userId, productId
        );
        Map<String, Boolean> body = response.getBody();
        return body != null && Boolean.TRUE.equals(body.get("purchased"));
    }
}
