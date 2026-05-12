package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherSystemAccess;

public record TeacherSystemAccessRequest(
        Boolean configureAccess,
        Boolean createAccount,
        String username,
        String temporaryPassword,
        Boolean notifyByEmail,
        String contactEmail,
        String status
) {
    public TeacherSystemAccess toDomain() {
        return new TeacherSystemAccess(
                Boolean.TRUE.equals(configureAccess),
                Boolean.TRUE.equals(createAccount),
                username == null ? "" : username.trim(),
                temporaryPassword == null ? "" : temporaryPassword.trim(),
                Boolean.TRUE.equals(notifyByEmail),
                contactEmail == null ? "" : contactEmail.trim(),
                status == null ? "" : status.trim()
        );
    }
}
