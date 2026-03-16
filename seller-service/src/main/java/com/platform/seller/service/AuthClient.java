package com.platform.seller.service;

import com.platform.seller.dto.InternalAuthUserResponse;
import com.platform.seller.exception.SellerException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class AuthClient {

    private final RestTemplate restTemplate;
    private final String authServiceUrl;

    public AuthClient(RestTemplate restTemplate, @Value("${auth.service.url}") String authServiceUrl) {
        this.restTemplate = restTemplate;
        this.authServiceUrl = authServiceUrl;
    }

    public InternalAuthUserResponse getUserByEmail(String email) {
        try {
            InternalAuthUserResponse response = restTemplate.getForObject(
                    authServiceUrl + "/internal/auth/users/by-email?email={email}",
                    InternalAuthUserResponse.class,
                    email
            );
            if (response == null) {
                throw new SellerException("User not found", HttpStatus.NOT_FOUND);
            }
            return response;
        } catch (SellerException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new SellerException("Failed to validate seller identity", HttpStatus.BAD_REQUEST);
        }
    }
}
