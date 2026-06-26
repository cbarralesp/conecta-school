package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

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
        @NotBlank String closingActivity,
        List<UUID> objectiveIds,
        List<PlanningClassObjectiveSelectionRequest> objectiveSelections
) {
}
