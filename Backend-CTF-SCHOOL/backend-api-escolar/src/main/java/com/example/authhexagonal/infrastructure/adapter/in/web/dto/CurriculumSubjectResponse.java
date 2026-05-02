package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.CurriculumSubject;

import java.util.UUID;

public record CurriculumSubjectResponse(
        UUID id,
        String slug,
        String nombre,
        int totalGrados
) {
    public static CurriculumSubjectResponse fromDomain(CurriculumSubject subject) {
        return new CurriculumSubjectResponse(
                subject.id(),
                subject.slug(),
                subject.nombre(),
                subject.totalGrados()
        );
    }
}
