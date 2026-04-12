package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PlanningClassCreateRequest(
        @NotNull Long unitId,
        @NotBlank String durationCode,
        @NotNull LocalDate plannedDate,
        @NotBlank String title,
        @NotBlank String objectiveCode,
        @NotBlank String evaluationType,
        String objectiveDescription,
        @NotBlank String startActivity,
        @NotBlank String developmentActivity,
        @NotBlank String closingActivity
) {
}
