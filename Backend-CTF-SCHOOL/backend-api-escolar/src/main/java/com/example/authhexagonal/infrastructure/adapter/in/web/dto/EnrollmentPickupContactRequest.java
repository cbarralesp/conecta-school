package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EnrollmentPickupContactRequest(
        @NotBlank @Size(max = 20) String run,
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 120) String lastName,
        @NotBlank @Size(max = 40) String phone,
        @NotBlank @Size(max = 80) String relation,
        boolean authorizedPickup
) {
}
