package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentSubjectUnit;

import java.util.List;

public record StudentSubjectUnitResponse(
        Long unitId,
        String unitNumber,
        String unitName,
        int totalClasses,
        int totalDocuments,
        int durationWeeks,
        int progressPercent,
        List<StudentSubjectClassResponse> classes
) {

    public static StudentSubjectUnitResponse fromDomain(StudentSubjectUnit unit) {
        return new StudentSubjectUnitResponse(
                unit.unitId(),
                unit.unitNumber(),
                unit.unitName(),
                unit.totalClasses(),
                unit.totalDocuments(),
                unit.durationWeeks(),
                unit.progressPercent(),
                unit.classes().stream().map(StudentSubjectClassResponse::fromDomain).toList()
        );
    }
}
