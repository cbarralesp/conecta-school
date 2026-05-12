package com.example.authhexagonal.domain.model;

public record EnrollmentStudentAccess(
        boolean configureAccess,
        boolean createStudentAccount,
        String username,
        String temporaryPassword,
        boolean notifyByEmail,
        String contactEmail,
        String status
) {
}
