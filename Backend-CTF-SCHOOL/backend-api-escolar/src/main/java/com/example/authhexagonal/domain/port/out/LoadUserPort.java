package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.AuthUser;

import java.util.Optional;

public interface LoadUserPort {

    Optional<AuthUser> findByUsername(String username);
}
