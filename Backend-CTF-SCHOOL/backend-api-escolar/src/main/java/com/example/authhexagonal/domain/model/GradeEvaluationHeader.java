package com.example.authhexagonal.domain.model;

public record GradeEvaluationHeader(
        Long id,
        String code,
        String name,
        int order,
        Double weight,
        String evaluationDate,
        String registrationType
) {
}
