package com.example.authhexagonal.domain.model;

public record AcademicSubject(
        Long id,
        String code,
        String name,
        String area,
        String colorHex,
        String description,
        String referenceLevel,
        String evaluationType,
        String displayLevel,
        int suggestedHours,
        boolean active,
        java.util.List<SubjectAssignedTeacher> assignedTeachers,
        java.util.List<Long> applicableGradeIds,
        java.util.List<String> applicableGradeNames,
        java.util.List<Long> applicableCourseIds,
        java.util.List<String> applicableCourseNames
) {
}
