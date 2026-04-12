package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.AcademicSubject;

public record SubjectResponse(
        Long id,
        String code,
        String name,
        String area,
        String colorHex,
        String description,
        String referenceLevel,
        int suggestedHours,
        boolean active
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
                subject.suggestedHours(),
                subject.active()
        );
    }
}
