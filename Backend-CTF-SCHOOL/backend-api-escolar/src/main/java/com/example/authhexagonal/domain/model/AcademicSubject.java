package com.example.authhexagonal.domain.model;

public record AcademicSubject(
        Long id,
        String code,
        String name,
        String area,
        String colorHex,
        String description,
        String referenceLevel,
        String displayLevel,
        int suggestedHours,
        boolean active,
        java.util.List<SubjectAssignedTeacher> assignedTeachers
) {
}
