package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PlanningClassDraftRequest(
        @NotNull Long unitId,
        @NotBlank String durationCode,
        @NotNull LocalDate plannedDate,
        @NotBlank String title,
        String objectiveCode,
        String evaluationType,
        String objectiveDescription,
        String startActivity,
        String developmentActivity,
        String closingActivity
) {
}
