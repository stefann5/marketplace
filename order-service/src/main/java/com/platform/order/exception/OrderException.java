package com.platform.order.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class OrderException extends RuntimeException {

    private final HttpStatus status;

    public OrderException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
