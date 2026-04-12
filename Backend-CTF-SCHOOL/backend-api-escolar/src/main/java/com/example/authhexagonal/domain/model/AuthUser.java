package com.example.authhexagonal.domain.model;

import java.util.List;

public record AuthUser(
        Long id,
        String username,
        String email,
        String displayName,
        String roleCode,
        String applicationRole,
        String encodedPassword,
        List<String> roles
) {
}
