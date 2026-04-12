package com.example.authhexagonal.domain.model;

public record PlanningUnitCatalogAssignment(
        Long loadId,
        Long subjectId,
        String subjectCode,
        String subjectName,
        String subjectColorHex,
        Long courseId,
        String courseCode,
        String courseName,
        int schoolYear,
        boolean homeroomTeacher
) {
}
