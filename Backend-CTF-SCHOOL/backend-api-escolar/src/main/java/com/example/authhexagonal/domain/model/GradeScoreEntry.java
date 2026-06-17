package com.example.authhexagonal.domain.model;

public record GradeScoreEntry(
        Long studentId,
        Long evaluationId,
        Double score,
        String conceptCode,
        Double percentage
) {
}
