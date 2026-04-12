package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentLatestGrade;

public record StudentLatestGradeResponse(
        String subjectName,
        String evaluationName,
        Double score,
        String periodName,
        String recordedAt
) {

    public static StudentLatestGradeResponse fromDomain(StudentLatestGrade grade) {
        return new StudentLatestGradeResponse(
                grade.subjectName(),
                grade.evaluationName(),
                grade.score(),
                grade.periodName(),
                grade.recordedAt()
        );
    }
}
