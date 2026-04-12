package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningUnit;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PlanningUnitResponse(
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
        String status,
        String createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static PlanningUnitResponse fromDomain(PlanningUnit unit) {
        return new PlanningUnitResponse(
                unit.id(),
                unit.loadId(),
                unit.subjectId(),
                unit.subjectName(),
                unit.courseId(),
                unit.courseName(),
                unit.unitNumber(),
                unit.unitNumberLabel(),
                unit.name(),
                unit.startWeek(),
                unit.startDate(),
                unit.endDate(),
                unit.estimatedWeeks(),
                unit.plannedClasses(),
                unit.generalDescription(),
                unit.learningObjectives(),
                unit.achievementIndicators(),
                unit.status().name(),
                unit.createdBy(),
                unit.createdAt(),
                unit.updatedAt()
        );
    }
}
