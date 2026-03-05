package com.platform.auth.controller;

import com.platform.auth.entity.User;
import com.platform.auth.enums.SellerStatus;
import com.platform.auth.service.AdminSellerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth/admin/sellers")
@RequiredArgsConstructor
public class AdminSellerController {

    private final AdminSellerService adminSellerService;

    @GetMapping
    public ResponseEntity<List<User>> listSellers(@RequestParam(required = false) SellerStatus status) {
        return ResponseEntity.ok(adminSellerService.listSellers(status));
    }

    @PostMapping("/{userId}/approve")
    public ResponseEntity<Void> approveSeller(@PathVariable UUID userId) {
        adminSellerService.approveSeller(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{userId}/reject")
    public ResponseEntity<Void> rejectSeller(@PathVariable UUID userId) {
        adminSellerService.rejectSeller(userId);
        return ResponseEntity.noContent().build();
    }
}
