package com.platform.catalog.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class CatalogException extends RuntimeException {

    private final HttpStatus status;

    public CatalogException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
