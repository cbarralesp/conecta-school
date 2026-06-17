package com.example.authhexagonal.domain.model;

public record GradeScoreCell(
        Long evaluationId,
        String code,
        Double score,
        String conceptCode,
        Double percentage,
        String registrationType
) {
}
