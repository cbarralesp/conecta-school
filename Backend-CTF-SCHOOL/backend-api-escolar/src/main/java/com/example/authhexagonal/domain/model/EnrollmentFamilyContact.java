package com.example.authhexagonal.domain.model;

public record EnrollmentFamilyContact(
        Long id,
        String run,
        String name,
        String lastName,
        String birthDate,
        String address,
        String phone,
        String email,
        String education
) {
}
