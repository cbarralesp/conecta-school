package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentStudentAccess;

public record EnrollmentStudentAccessResponse(
        boolean configureAccess,
        boolean createStudentAccount,
        String username,
        String temporaryPassword,
        boolean notifyByEmail,
        String contactEmail,
        String status
) {
    public static EnrollmentStudentAccessResponse fromDomain(EnrollmentStudentAccess access) {
        return new EnrollmentStudentAccessResponse(
                access.configureAccess(),
                access.createStudentAccount(),
                access.username() == null ? "" : access.username(),
                "",
                access.notifyByEmail(),
                access.contactEmail(),
                access.status()
        );
    }
}
