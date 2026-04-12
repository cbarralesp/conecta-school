package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningSummaryUnit;

public record PlanningSummaryUnitResponse(
        Long id,
        String code,
        String name,
        Long subjectId,
        String subjectName,
        String courseName,
        int plannedClasses,
        int totalClasses,
        int publishedClasses,
        int totalDocuments,
        String weekRange,
        int progressPercent,
        String status
) {

    public static PlanningSummaryUnitResponse fromDomain(PlanningSummaryUnit unit) {
        return new PlanningSummaryUnitResponse(
                unit.id(),
                unit.code(),
                unit.name(),
                unit.subjectId(),
                unit.subjectName(),
                unit.courseName(),
                unit.plannedClasses(),
                unit.totalClasses(),
                unit.publishedClasses(),
                unit.totalDocuments(),
                unit.weekRange(),
                unit.progressPercent(),
                unit.status().name()
        );
    }
}
