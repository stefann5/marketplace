package com.platform.catalog.controller;

import com.platform.catalog.dto.StockCheckRequest;
import com.platform.catalog.dto.StockCheckResponse;
import com.platform.catalog.dto.StockDecrementRequest;
import com.platform.catalog.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/internal/products")
@RequiredArgsConstructor
public class InternalProductController {

    private final ProductService productService;

    @PostMapping("/stock-check")
    public ResponseEntity<List<StockCheckResponse>> checkStock(@RequestBody List<StockCheckRequest> requests) {
        return ResponseEntity.ok(productService.checkStock(requests));
    }

    @PatchMapping("/stock-decrement")
    public ResponseEntity<Void> decrementStock(@RequestBody List<StockDecrementRequest> requests) {
        productService.decrementStock(requests);
        return ResponseEntity.ok().build();
    }
}
