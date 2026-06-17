package com.example.authhexagonal.domain.model;

public record PedagogicalReportSaveCommand(
        Long courseId,
        Long periodId,
        Long studentId,
        PedagogicalReportContent content
) {
}
