package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentStudentAccess;

public record EnrollmentStudentAccessRequest(
        Boolean configureAccess,
        Boolean createStudentAccount,
        String username,
        String temporaryPassword,
        Boolean notifyByEmail,
        String contactEmail,
        String status
) {
    public EnrollmentStudentAccess toDomain() {
        return new EnrollmentStudentAccess(
                Boolean.TRUE.equals(configureAccess),
                Boolean.TRUE.equals(createStudentAccount),
                username == null ? "" : username.trim(),
                temporaryPassword == null ? "" : temporaryPassword.trim(),
                Boolean.TRUE.equals(notifyByEmail),
                contactEmail == null ? "" : contactEmail.trim(),
                status == null ? "" : status.trim()
        );
    }
}
