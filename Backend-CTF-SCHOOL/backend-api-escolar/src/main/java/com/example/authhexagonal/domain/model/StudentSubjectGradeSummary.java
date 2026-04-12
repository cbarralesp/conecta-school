package com.example.authhexagonal.domain.model;

import java.util.List;

public record StudentSubjectGradeSummary(
        String subjectName,
        Double average,
        Double latestScore,
        List<StudentGradeEvaluation> evaluations
) {
}
