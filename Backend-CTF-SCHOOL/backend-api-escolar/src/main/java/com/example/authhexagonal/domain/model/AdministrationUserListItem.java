package com.example.authhexagonal.domain.model;

import java.time.LocalDateTime;

public record AdministrationUserListItem(
        Long id,
        String username,
        String fullName,
        String email,
        String run,
        String phone,
        String roleCode,
        String roleName,
        LocalDateTime lastAccessAt,
        String lastAccessLabel,
        String status,
        boolean canDelete
) {
}
