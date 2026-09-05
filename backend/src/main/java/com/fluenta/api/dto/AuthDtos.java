package com.fluenta.api.dto;

/** Auth request/response payloads. */
public final class AuthDtos {
    private AuthDtos() {}

    public record LoginRequest(String email, String password) {}

    public record LoginResponse(String token, UserDto user) {}
}
