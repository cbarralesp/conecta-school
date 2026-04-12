package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.AuthTokens;
import com.example.authhexagonal.domain.model.AuthUser;

public record LoginResponse(
        String token,
        AuthenticatedUserResponse user,
        String accessToken,
        String tokenType,
        long expiresIn
) {

    public static LoginResponse fromDomain(AuthTokens tokens, AuthUser user) {
        return new LoginResponse(
                tokens.accessToken(),
                AuthenticatedUserResponse.fromDomain(user),
                tokens.accessToken(),
                tokens.tokenType(),
                tokens.expiresIn()
        );
    }
}
