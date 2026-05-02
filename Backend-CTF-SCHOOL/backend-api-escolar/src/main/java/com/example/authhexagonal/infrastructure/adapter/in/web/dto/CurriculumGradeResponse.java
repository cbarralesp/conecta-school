package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.CurriculumGrade;

import java.util.UUID;

public record CurriculumGradeResponse(
        UUID id,
        String grado,
        String label,
        int totalObjetivos
) {
    public static CurriculumGradeResponse fromDomain(CurriculumGrade grade) {
        return new CurriculumGradeResponse(
                grade.id(),
                grade.grado(),
                grade.label(),
                grade.totalObjetivos()
        );
    }
}
