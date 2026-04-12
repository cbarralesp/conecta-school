package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.AuthUser;

public record UserResponse(
        Long id,
        String nombre,
        String email,
        String username,
        String rol,
        String roleCode,
        java.util.List<String> roles
) {

    public static UserResponse fromDomain(AuthUser user) {
        return new UserResponse(
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
