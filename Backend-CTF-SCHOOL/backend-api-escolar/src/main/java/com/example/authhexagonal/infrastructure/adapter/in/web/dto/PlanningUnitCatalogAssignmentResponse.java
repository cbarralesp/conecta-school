package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningUnitCatalogAssignment;

public record PlanningUnitCatalogAssignmentResponse(
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
    public static PlanningUnitCatalogAssignmentResponse fromDomain(PlanningUnitCatalogAssignment assignment) {
        return new PlanningUnitCatalogAssignmentResponse(
                assignment.loadId(),
                assignment.subjectId(),
                assignment.subjectCode(),
                assignment.subjectName(),
                assignment.subjectColorHex(),
                assignment.courseId(),
                assignment.courseCode(),
                assignment.courseName(),
                assignment.schoolYear(),
                assignment.homeroomTeacher()
        );
    }
}
