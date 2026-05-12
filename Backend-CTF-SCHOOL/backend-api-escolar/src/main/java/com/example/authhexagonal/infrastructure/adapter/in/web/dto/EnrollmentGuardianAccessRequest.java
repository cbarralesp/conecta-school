package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentGuardianAccess;

public record EnrollmentGuardianAccessRequest(
        Boolean configureAccess,
        Boolean createGuardianAccount,
        String username,
        String temporaryPassword,
        Boolean notifyByEmail,
        String contactEmail,
        String status
) {
    public EnrollmentGuardianAccess toDomain() {
        return new EnrollmentGuardianAccess(
                Boolean.TRUE.equals(configureAccess),
                Boolean.TRUE.equals(createGuardianAccount),
                username == null ? "" : username.trim(),
                temporaryPassword == null ? "" : temporaryPassword.trim(),
                Boolean.TRUE.equals(notifyByEmail),
                contactEmail == null ? "" : contactEmail.trim(),
                status == null ? "" : status.trim()
        );
    }
}
