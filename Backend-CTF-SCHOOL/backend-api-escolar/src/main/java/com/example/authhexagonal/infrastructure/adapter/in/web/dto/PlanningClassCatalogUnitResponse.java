package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningClassCatalogUnit;

public record PlanningClassCatalogUnitResponse(
        Long unitId,
        String unitNumberLabel,
        String unitName,
        String learningObjectives,
        Long subjectId,
        String subjectName,
        Long courseId,
        String courseName,
        Integer schoolYear,
        Integer semester,
        String status
) {
    public static PlanningClassCatalogUnitResponse fromDomain(PlanningClassCatalogUnit unit) {
        return new PlanningClassCatalogUnitResponse(
                unit.unitId(),
                unit.unitNumberLabel(),
                unit.unitName(),
                unit.learningObjectives(),
                unit.subjectId(),
                unit.subjectName(),
                unit.courseId(),
                unit.courseName(),
                unit.schoolYear(),
                unit.semester(),
                unit.status()
        );
    }
}
