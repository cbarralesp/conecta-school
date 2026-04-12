package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentGradeEvaluation;

public record StudentGradeEvaluationResponse(
        String evaluationName,
        Double score,
        String periodName,
        String recordedAt
) {

    public static StudentGradeEvaluationResponse fromDomain(StudentGradeEvaluation evaluation) {
        return new StudentGradeEvaluationResponse(
                evaluation.evaluationName(),
                evaluation.score(),
                evaluation.periodName(),
                evaluation.recordedAt()
        );
    }
}
