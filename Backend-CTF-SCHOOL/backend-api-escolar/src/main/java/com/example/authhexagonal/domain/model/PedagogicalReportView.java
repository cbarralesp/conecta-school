package com.example.authhexagonal.domain.model;

public record PedagogicalReportView(
        Long courseId,
        String courseName,
        Long periodId,
        String periodName,
        Long studentId,
        String studentRun,
        String studentName,
        Integer schoolYear,
        String levelCode,
        String levelLabel,
        PedagogicalReportContent content
) {
}
