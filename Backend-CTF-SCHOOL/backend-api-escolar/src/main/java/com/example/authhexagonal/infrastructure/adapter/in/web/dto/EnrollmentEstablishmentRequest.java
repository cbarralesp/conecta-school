package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.Size;

public record EnrollmentEstablishmentRequest(
        Long regionId,
        Long communeId,
        @Size(max = 160) String name,
        @Size(max = 20) String academicYear,
        @Size(max = 80) String dependency,
        @Size(max = 120) String region,
        @Size(max = 120) String commune,
        @Size(max = 255) String address
) {
}
