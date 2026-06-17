package com.example.authhexagonal.domain.model;

public record GradeSaveCommand(
        Long studentId,
        Long evaluationId,
        Double score,
        String conceptCode,
        Double percentage
) {
}
