package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.AcademicSubject;

import java.util.List;

public record SubjectResponse(
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
        List<SubjectAssignedTeacherResponse> assignedTeachers,
        List<Long> applicableGradeIds,
        List<String> applicableGradeNames,
        List<Long> applicableCourseIds,
        List<String> applicableCourseNames
) {
    public static SubjectResponse fromDomain(AcademicSubject subject) {
        return new SubjectResponse(
                subject.id(),
                subject.code(),
                subject.name(),
                subject.area(),
                subject.colorHex(),
                subject.description(),
                subject.referenceLevel(),
                subject.evaluationType(),
                subject.displayLevel(),
                subject.suggestedHours(),
                subject.active(),
                subject.assignedTeachers().stream()
                        .map(SubjectAssignedTeacherResponse::fromDomain)
                        .toList(),
                subject.applicableGradeIds(),
                subject.applicableGradeNames(),
                subject.applicableCourseIds(),
                subject.applicableCourseNames()
        );
    }
}
