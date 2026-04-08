package com.platform.analytics.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AnalyticsException extends RuntimeException {

    private final HttpStatus status;

    public AnalyticsException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
