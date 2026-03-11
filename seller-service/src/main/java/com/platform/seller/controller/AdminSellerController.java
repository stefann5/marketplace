package com.platform.seller.controller;

import com.platform.seller.dto.SellerProfileResponse;
import com.platform.seller.enums.SellerStatus;
import com.platform.seller.service.SellerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/sellers")
@RequiredArgsConstructor
public class AdminSellerController {

    private final SellerService sellerService;

    @GetMapping
    public ResponseEntity<List<SellerProfileResponse>> list(@RequestParam(required = false) SellerStatus status) {
        return ResponseEntity.ok(sellerService.listByStatus(status));
    }

    @GetMapping("/{sellerId}")
    public ResponseEntity<SellerProfileResponse> getDetail(@PathVariable UUID sellerId) {
        return ResponseEntity.ok(sellerService.getById(sellerId));
    }

    @PostMapping("/{sellerId}/approve")
    public ResponseEntity<Void> approve(@PathVariable UUID sellerId) {
        sellerService.approve(sellerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{sellerId}/reject")
    public ResponseEntity<Void> reject(@PathVariable UUID sellerId) {
        sellerService.reject(sellerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{sellerId}/suspend")
    public ResponseEntity<Void> suspend(@PathVariable UUID sellerId) {
        sellerService.suspend(sellerId);
        return ResponseEntity.noContent().build();
    }
}
