package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.AuthUser;

public interface CurrentUserUseCase {

    AuthUser getCurrentUser(String username);
}
