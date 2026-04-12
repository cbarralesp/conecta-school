package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PlanningUnitDraftRequest(
        @NotNull Long subjectId,
        @NotNull Long courseId,
        @NotBlank String unitNumber,
        @NotBlank String name,
        Integer startWeek,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @Min(1) Integer estimatedWeeks,
        @Min(0) Integer plannedClasses,
        String generalDescription,
        String learningObjectives,
        String achievementIndicators
) {
}
