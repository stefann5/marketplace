package com.platform.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

@Component
public class SellerClient {

    private final RestTemplate restTemplate;
    private final String sellerServiceUrl;

    public SellerClient(RestTemplate restTemplate, @Value("${seller.service.url}") String sellerServiceUrl) {
        this.restTemplate = restTemplate;
        this.sellerServiceUrl = sellerServiceUrl;
    }

    @SuppressWarnings("unchecked")
    public String getSellerStatus(UUID userId) {
        try {
            Map<String, String> response = restTemplate.getForObject(
                    sellerServiceUrl + "/internal/sellers/{userId}/status",
                    Map.class,
                    userId
            );
            return response != null ? response.get("status") : "NOT_REGISTERED";
        } catch (Exception e) {
            return "NOT_REGISTERED";
        }
    }
}
