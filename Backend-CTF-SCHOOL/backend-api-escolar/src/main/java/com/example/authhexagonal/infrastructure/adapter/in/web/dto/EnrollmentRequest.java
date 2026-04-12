package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record EnrollmentRequest(
        @NotBlank @Size(max = 20) String studentRun,
        @NotBlank @Size(max = 120) String studentName,
        @NotBlank @Size(max = 160) String studentLastName,
        @NotNull LocalDate birthDate,
        @NotBlank @Size(max = 30) String gender,
        @NotNull Long courseId,
        @NotBlank @Size(max = 255) String address,
        @Size(max = 255) String specialNeeds,
        @NotBlank @Size(max = 40) String status,
        @NotNull LocalDate enrollmentDate,
        @NotNull @Valid EnrollmentGuardianRequest guardian,
        @NotEmpty List<@Valid EnrollmentPickupContactRequest> pickupContacts
) {
}
