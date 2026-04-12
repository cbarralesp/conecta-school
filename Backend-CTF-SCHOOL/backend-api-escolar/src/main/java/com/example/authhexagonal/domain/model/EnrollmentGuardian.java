package com.example.authhexagonal.domain.model;

public record EnrollmentGuardian(
        Long id,
        String run,
        String name,
        String lastName,
        String phone,
        String email,
        String relation,
        boolean authorizedPickup
) {
}
