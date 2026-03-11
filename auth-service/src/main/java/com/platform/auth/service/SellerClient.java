package com.platform.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

@Component
public class SellerClient {

    private final RestTemplate restTemplate;
    private final String sellerServiceUrl;

    public SellerClient(RestTemplate restTemplate, @Value("${seller.service.url}") String sellerServiceUrl) {
        this.restTemplate = restTemplate;
        this.sellerServiceUrl = sellerServiceUrl;
    }

    public String getSellerStatus(UUID userId) {
        try {
            return restTemplate.getForObject(
                    sellerServiceUrl + "/internal/sellers/{userId}/status",
                    String.class,
                    userId
            );
        } catch (Exception e) {
            return "NOT_REGISTERED";
        }
    }
}
