package com.platform.catalog.client;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SellerClient {

    private final RestTemplate restTemplate;

    @Value("${seller.service.url}")
    private String sellerServiceUrl;

    public String getTenantStatus(UUID tenantId) {
        ResponseEntity<Map<String, String>> response = restTemplate.exchange(
                sellerServiceUrl + "/internal/sellers/tenant/{tenantId}/status",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {},
                tenantId
        );
        Map<String, String> body = response.getBody();
        return body != null ? body.get("status") : null;
    }

    public List<UUID> getActiveTenantIds() {
        ResponseEntity<Map<String, List<UUID>>> response = restTemplate.exchange(
                sellerServiceUrl + "/internal/sellers/active-tenants",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {}
        );
        Map<String, List<UUID>> body = response.getBody();
        return body != null && body.get("tenantIds") != null ? body.get("tenantIds") : List.of();
    }

    public boolean isTenantActive(UUID tenantId) {
        return "ACTIVE".equals(getTenantStatus(tenantId));
    }
}
