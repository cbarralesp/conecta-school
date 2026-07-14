package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningSummaryUnit;

import java.time.LocalDate;

public record PlanningSummaryUnitResponse(
        Long id,
        String code,
        String name,
        String unitColorHex,
        Long subjectId,
        String subjectName,
        String subjectColorHex,
        String courseName,
        int plannedClasses,
        int totalClasses,
        int publishedClasses,
        int totalDocuments,
        LocalDate startDate,
        LocalDate endDate,
        String weekRange,
        int progressPercent,
        String status
) {

    public static PlanningSummaryUnitResponse fromDomain(PlanningSummaryUnit unit) {
        return new PlanningSummaryUnitResponse(
                unit.id(),
                unit.code(),
                unit.name(),
                unit.unitColorHex(),
                unit.subjectId(),
                unit.subjectName(),
                unit.subjectColorHex(),
                unit.courseName(),
                unit.plannedClasses(),
                unit.totalClasses(),
                unit.publishedClasses(),
                unit.totalDocuments(),
                unit.startDate(),
                unit.endDate(),
                unit.weekRange(),
                unit.progressPercent(),
                unit.status().name()
        );
    }
}
