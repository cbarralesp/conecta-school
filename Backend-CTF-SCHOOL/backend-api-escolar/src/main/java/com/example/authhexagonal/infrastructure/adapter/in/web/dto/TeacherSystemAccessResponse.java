package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherSystemAccess;

public record TeacherSystemAccessResponse(
        boolean configureAccess,
        boolean createAccount,
        String username,
        String temporaryPassword,
        boolean notifyByEmail,
        String contactEmail,
        String status
) {
    public static TeacherSystemAccessResponse fromDomain(TeacherSystemAccess access) {
        return new TeacherSystemAccessResponse(
                access.configureAccess(),
                access.createAccount(),
                access.username() == null ? "" : access.username(),
                "",
                access.notifyByEmail(),
                access.contactEmail() == null ? "" : access.contactEmail(),
                access.status() == null ? "" : access.status()
        );
    }
}
