package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentSubjectGradeSummary;

import java.util.List;

public record StudentSubjectGradeSummaryResponse(
        String subjectName,
        Double average,
        Double latestScore,
        List<StudentGradeEvaluationResponse> evaluations
) {

    public static StudentSubjectGradeSummaryResponse fromDomain(StudentSubjectGradeSummary summary) {
        return new StudentSubjectGradeSummaryResponse(
                summary.subjectName(),
                summary.average(),
                summary.latestScore(),
                summary.evaluations().stream().map(StudentGradeEvaluationResponse::fromDomain).toList()
        );
    }
}
