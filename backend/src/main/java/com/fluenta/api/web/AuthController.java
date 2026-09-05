package com.fluenta.api.web;

import com.fluenta.api.dto.AuthDtos.LoginRequest;
import com.fluenta.api.dto.AuthDtos.LoginResponse;
import com.fluenta.api.service.AuthService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody(required = false) LoginRequest body) {
        return auth.login(body == null ? null : body.email());
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(@RequestHeader(value = "Authorization", required = false) String authz) {
        if (authz != null && authz.startsWith("Bearer ")) auth.logout(authz.substring(7).trim());
        return Map.of("ok", true);
    }
}
