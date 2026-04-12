package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.AuthTokens;

public interface AuthenticateUserUseCase {

    AuthTokens authenticate(String username, String password);
}
