package com.example.authhexagonal.domain.model;

public record TeacherSystemAccess(
        boolean configureAccess,
        boolean createAccount,
        String username,
        String temporaryPassword,
        boolean notifyByEmail,
        String contactEmail,
        String status
) {
}
