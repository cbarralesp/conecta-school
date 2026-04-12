package com.example.authhexagonal.domain.model;

public record EnrollmentPickupContact(
        Long id,
        String run,
        String name,
        String lastName,
        String phone,
        String relation,
        boolean authorizedPickup
) {
}
