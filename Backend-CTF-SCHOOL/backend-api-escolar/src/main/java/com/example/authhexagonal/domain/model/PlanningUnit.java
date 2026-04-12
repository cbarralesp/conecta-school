package com.example.authhexagonal.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PlanningUnit(
        Long id,
        Long loadId,
        Long subjectId,
        String subjectName,
        Long courseId,
        String courseName,
        String unitNumber,
        String unitNumberLabel,
        String name,
        Integer startWeek,
        LocalDate startDate,
        LocalDate endDate,
        int estimatedWeeks,
        int plannedClasses,
        String generalDescription,
        String learningObjectives,
        String achievementIndicators,
        PlanningUnitStatus status,
        String createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
