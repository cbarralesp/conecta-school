package com.example.authhexagonal.domain.model;

import java.time.LocalDate;

public record AdministrationUserCommand(
        String username,
        String firstName,
        String paternalLastName,
        String maternalLastName,
        String email,
        String run,
        String phone,
        String initialStatus,
        String roleCode,
        String temporaryPassword,
        boolean forcePasswordChange,
        boolean twoFactorRequired,
        LocalDate accountExpiresAt
) {
}
