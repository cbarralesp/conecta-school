package com.example.authhexagonal.domain.model;

public record StudentGradeEvaluation(
        String evaluationName,
        Double score,
        String periodName,
        String recordedAt
) {
}
