package com.example.authhexagonal.domain.model;

public record TeacherEmergencyContact(
        Long id,
        String fullName,
        String relation,
        String phone
) {
}
