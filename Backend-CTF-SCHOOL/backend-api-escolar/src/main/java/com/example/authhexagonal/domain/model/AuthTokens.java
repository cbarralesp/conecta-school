package com.example.authhexagonal.domain.model;

public record AuthTokens(
        String accessToken,
        String tokenType,
        long expiresIn
) {
}
