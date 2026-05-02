package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EnrollmentEstablishmentRequest(
        Long regionId,
        Long communeId,
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Size(max = 20) String academicYear,
        @NotBlank @Size(max = 80) String dependency,
        @NotBlank @Size(max = 120) String region,
        @NotBlank @Size(max = 120) String commune,
        @NotBlank @Size(max = 255) String address
) {
}
