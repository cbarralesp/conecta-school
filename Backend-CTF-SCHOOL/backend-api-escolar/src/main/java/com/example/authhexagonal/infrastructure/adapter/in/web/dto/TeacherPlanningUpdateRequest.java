package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record TeacherPlanningUpdateRequest(
        @NotBlank String title,
        @NotBlank String unit,
        @NotBlank String learningObjective,
        @NotBlank String status,
        @NotNull LocalDate classDate,
        @NotBlank String resources,
        @NotBlank String activities,
        @NotBlank String evaluation,
        String observations
) {
}
