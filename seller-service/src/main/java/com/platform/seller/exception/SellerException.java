package com.platform.seller.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class SellerException extends RuntimeException {

    private final HttpStatus status;

    public SellerException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
