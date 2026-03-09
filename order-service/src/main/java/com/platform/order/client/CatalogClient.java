package com.platform.order.client;

import com.platform.order.exception.OrderException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Component
@RequiredArgsConstructor
public class CatalogClient {

    private final RestTemplate restTemplate;

    @Value("${catalog.service.url}")
    private String catalogServiceUrl;

    public List<StockCheckResponse> checkStock(List<StockCheckRequest> requests) {
        ResponseEntity<List<StockCheckResponse>> response = restTemplate.exchange(
                catalogServiceUrl + "/internal/products/stock-check",
                HttpMethod.POST,
                new HttpEntity<>(requests),
                new ParameterizedTypeReference<>() {}
        );
        return response.getBody();
    }

    public void decrementStock(List<StockDecrementRequest> requests) {
        try {
            restTemplate.exchange(
                    catalogServiceUrl + "/internal/products/stock-decrement",
                    HttpMethod.PATCH,
                    new HttpEntity<>(requests),
                    Void.class
            );
        } catch (HttpClientErrorException.Conflict e) {
            throw new OrderException("Stock changed during checkout, please try again", HttpStatus.CONFLICT);
        }
    }
}
