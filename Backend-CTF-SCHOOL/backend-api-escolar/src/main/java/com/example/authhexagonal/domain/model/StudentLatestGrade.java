package com.example.authhexagonal.domain.model;

public record StudentLatestGrade(
        String subjectName,
        String evaluationName,
        Double score,
        String periodName,
        String recordedAt
) {
}
