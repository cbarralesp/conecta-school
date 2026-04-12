package com.example.authhexagonal.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AdministrationUserDetail(
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
        boolean canDelete,
        String firstName,
        String paternalLastName,
        String maternalLastName,
        String roleDescription,
        boolean forcePasswordChange,
        boolean twoFactorRequired,
        LocalDate accountExpiresAt
) {
}
