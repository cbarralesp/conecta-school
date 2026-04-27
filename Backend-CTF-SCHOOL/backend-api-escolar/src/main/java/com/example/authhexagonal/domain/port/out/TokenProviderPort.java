package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.AuthTokens;
import com.example.authhexagonal.domain.model.AuthUser;

import java.util.Optional;

public interface TokenProviderPort {

    AuthTokens generateToken(AuthUser user);

    Optional<String> extractUsername(String token);

    boolean isTokenValid(String token, AuthUser user);
}
