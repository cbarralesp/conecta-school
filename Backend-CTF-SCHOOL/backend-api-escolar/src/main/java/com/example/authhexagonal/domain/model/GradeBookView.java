package com.example.authhexagonal.domain.model;

import java.util.List;

public record GradeBookView(
        Long courseId,
        String courseName,
        Long periodId,
        String periodName,
        Long subjectId,
        String subjectName,
        String subjectEvaluationType,
        GradeBookSummary summary,
        List<GradeSubjectTab> subjects,
        List<GradeEvaluationHeader> evaluations,
        List<GradeBookStudentRow> students
) {
}
