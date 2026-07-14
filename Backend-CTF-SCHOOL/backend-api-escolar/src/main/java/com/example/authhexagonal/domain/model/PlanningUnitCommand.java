package com.example.authhexagonal.domain.model;

import java.time.LocalDate;

public record PlanningUnitCommand(
        Long subjectId,
        Long courseId,
        String unitNumber,
        String name,
        String colorHex,
        Integer startWeek,
        LocalDate startDate,
        LocalDate endDate,
        Integer estimatedWeeks,
        Integer plannedClasses,
        String generalDescription,
        String learningObjectives,
        String achievementIndicators
) {
}
