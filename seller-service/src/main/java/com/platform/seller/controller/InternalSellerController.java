package com.platform.seller.controller;

import com.platform.seller.service.SellerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/internal/sellers")
@RequiredArgsConstructor
public class InternalSellerController {

    private final SellerService sellerService;

    @GetMapping("/{userId}/status")
    public ResponseEntity<Map<String, String>> getStatus(@PathVariable UUID userId) {
        String status = sellerService.getStatusByUserId(userId);
        if (status == null) {
            return ResponseEntity.ok(Map.of("status", "NOT_REGISTERED"));
        }
        return ResponseEntity.ok(Map.of("status", status));
    }
}
