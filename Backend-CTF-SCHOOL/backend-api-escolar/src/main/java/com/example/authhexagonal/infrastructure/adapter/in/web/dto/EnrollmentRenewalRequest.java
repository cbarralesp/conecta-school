package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record EnrollmentRenewalRequest(
        Long courseId,
        @NotNull @Valid EnrollmentCourseSelectionRequest courseSelection,
        LocalDate enrollmentDate
) {
}
