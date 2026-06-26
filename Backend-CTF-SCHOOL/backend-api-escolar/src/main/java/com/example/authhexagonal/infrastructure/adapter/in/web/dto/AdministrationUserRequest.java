package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.AdministrationUserCommand;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record AdministrationUserRequest(
        String username,
        @NotBlank String firstName,
        @NotBlank String paternalLastName,
        String maternalLastName,
        @NotBlank @Email String email,
        @NotBlank @Pattern(regexp = "^\\d{1,2}\\.\\d{3}\\.\\d{3}-[\\dkK]$") String run,
        @NotBlank @Pattern(regexp = "^\\+56\\s9\\s\\d{4}\\s\\d{4}$") String phone,
        String initialStatus,
        String status,
        @NotBlank String roleCode,
        String temporaryPassword,
        @NotNull Boolean forcePasswordChange,
        @NotNull Boolean twoFactorRequired,
        LocalDate accountExpiresAt
) {
    public AdministrationUserCommand toDomain() {
        return new AdministrationUserCommand(
                username == null ? "" : username,
                firstName,
                paternalLastName,
                maternalLastName == null ? "" : maternalLastName,
                email,
                run,
                phone,
                resolveStatus(),
                roleCode,
                temporaryPassword == null ? "" : temporaryPassword,
                Boolean.TRUE.equals(forcePasswordChange),
                Boolean.TRUE.equals(twoFactorRequired),
                accountExpiresAt
        );
    }

    private String resolveStatus() {
        if (initialStatus != null && !initialStatus.isBlank()) {
            return initialStatus.trim();
        }
        if (status != null && !status.isBlank()) {
            return status.trim();
        }
        return "Activo";
    }
}
