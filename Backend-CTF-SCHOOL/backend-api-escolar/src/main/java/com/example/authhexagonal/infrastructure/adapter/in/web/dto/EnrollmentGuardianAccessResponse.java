package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentGuardianAccess;

public record EnrollmentGuardianAccessResponse(
        boolean configureAccess,
        boolean createGuardianAccount,
        String username,
        String temporaryPassword,
        boolean notifyByEmail,
        String contactEmail,
        String status
) {
    public static EnrollmentGuardianAccessResponse fromDomain(EnrollmentGuardianAccess access) {
        return new EnrollmentGuardianAccessResponse(
                access.configureAccess(),
                access.createGuardianAccount(),
                access.username() == null ? "" : access.username(),
                "",
                access.notifyByEmail(),
                access.contactEmail(),
                access.status()
        );
    }
}
