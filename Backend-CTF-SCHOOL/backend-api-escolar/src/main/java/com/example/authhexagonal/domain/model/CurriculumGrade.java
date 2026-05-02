package com.example.authhexagonal.domain.model;

import java.util.UUID;

public record CurriculumGrade(
        UUID id,
        UUID subjectId,
        String grado,
        String label,
        int totalObjetivos
) {
}
