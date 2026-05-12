package com.example.authhexagonal.domain.model;

public record EnrollmentGuardianAccess(
        boolean configureAccess,
        boolean createGuardianAccount,
        String username,
        String temporaryPassword,
        boolean notifyByEmail,
        String contactEmail,
        String status
) {
}
