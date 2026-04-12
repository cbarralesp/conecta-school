package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.AuthUser;

import java.util.List;

public record AuthenticatedUserResponse(
        Long id,
        String nombre,
        String email,
        String username,
        String rol,
        String roleCode,
        List<String> roles
) {

    public static AuthenticatedUserResponse fromDomain(AuthUser user) {
        return new AuthenticatedUserResponse(
                user.id(),
                user.displayName(),
                user.email(),
                user.username(),
                user.applicationRole(),
                user.roleCode(),
                user.roles()
        );
    }
}
