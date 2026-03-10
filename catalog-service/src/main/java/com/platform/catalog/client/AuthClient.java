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
public class AuthClient {

    private final RestTemplate restTemplate;

    @Value("${auth.service.url}")
    private String authServiceUrl;

    public String getUserEmail(UUID userId) {
        ResponseEntity<Map<String, String>> response = restTemplate.exchange(
                authServiceUrl + "/internal/users/{userId}/email",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {},
                userId
        );
        Map<String, String> body = response.getBody();
        return body != null ? body.get("email") : null;
    }
}
