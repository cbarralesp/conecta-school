package com.example.authhexagonal.domain.model;

public record PlanningClassCatalogUnit(
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
}
