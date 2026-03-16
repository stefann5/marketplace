package com.platform.auth.controller;

import com.platform.auth.dto.InternalUserContextResponse;
import com.platform.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/auth")
@RequiredArgsConstructor
public class InternalAuthController {

    private final AuthService authService;

    @GetMapping("/users/by-email")
    public ResponseEntity<InternalUserContextResponse> getUserByEmail(@RequestParam String email) {
        return ResponseEntity.ok(authService.getUserContextByEmail(email));
    }
}
