package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record EnrollmentFamilyContactRequest(
        @Size(max = 20) String run,
        @Size(max = 120) String name,
        @Size(max = 120) String lastName,
        @Size(max = 20) String birthDate,
        @Size(max = 255) String address,
        @Size(max = 40) String phone,
        @Email @Size(max = 160) String email,
        @Size(max = 120) String education
) {
}
