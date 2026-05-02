package com.example.authhexagonal.domain.model;

public record EnrollmentEstablishment(
        Long regionId,
        Long communeId,
        String name,
        String academicYear,
        String dependency,
        String region,
        String commune,
        String address
) {
}
