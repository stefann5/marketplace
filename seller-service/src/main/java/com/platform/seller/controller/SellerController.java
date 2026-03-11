package com.platform.seller.controller;

import com.platform.seller.dto.*;
import com.platform.seller.service.SellerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sellers")
@RequiredArgsConstructor
public class SellerController {

    private final SellerService sellerService;

    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SellerProfileResponse> register(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestHeader("X-Tenant-Id") UUID tenantId,
            @RequestPart("profile") @Valid SellerRegistrationRequest request,
            @RequestPart(value = "documents", required = false) List<MultipartFile> documents,
            @RequestPart(value = "logo", required = false) MultipartFile logo) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sellerService.register(userId, tenantId, request, documents, logo));
    }

    @GetMapping("/me")
    public ResponseEntity<SellerProfileResponse> getMyProfile(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(sellerService.getByUserId(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<SellerProfileResponse> updateProfile(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid UpdateProfileRequest request) {
        return ResponseEntity.ok(sellerService.updateProfile(userId, request));
    }

    @PostMapping(value = "/me/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SellerProfileResponse> updateLogo(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestPart("logo") MultipartFile logo) {
        return ResponseEntity.ok(sellerService.updateLogo(userId, logo));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<SellerProfileResponse> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(sellerService.getBySlug(slug));
    }

    @GetMapping("/{slug}/theme")
    public ResponseEntity<SellerProfileResponse.ThemeResponse> getTheme(@PathVariable String slug) {
        return ResponseEntity.ok(sellerService.getTheme(slug));
    }

    @PutMapping("/me/theme")
    public ResponseEntity<SellerProfileResponse.ThemeResponse> updateTheme(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody @Valid ThemeRequest request) {
        return ResponseEntity.ok(sellerService.updateTheme(userId, request));
    }
}
