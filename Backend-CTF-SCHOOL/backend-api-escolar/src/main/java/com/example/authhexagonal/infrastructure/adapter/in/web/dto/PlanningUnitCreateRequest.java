package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record PlanningUnitCreateRequest(
        @NotNull Long subjectId,
        @NotNull Long courseId,
        @NotBlank String unitNumber,
        @NotBlank String name,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String colorHex,
        Integer startWeek,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotNull @Min(1) Integer estimatedWeeks,
        @NotNull @Min(0) Integer plannedClasses,
        String generalDescription,
        String learningObjectives,
        String achievementIndicators
) {
}
