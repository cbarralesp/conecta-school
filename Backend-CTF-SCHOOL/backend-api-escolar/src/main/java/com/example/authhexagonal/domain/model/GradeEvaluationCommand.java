package com.example.authhexagonal.domain.model;

import java.time.LocalDate;

public record GradeEvaluationCommand(
        Long courseId,
        Long periodId,
        Long subjectId,
        String code,
        String name,
        Double weight,
        LocalDate evaluationDate,
        String registrationType
) {
}
