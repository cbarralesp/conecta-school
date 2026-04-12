package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentSubjectMetrics;

public record StudentSubjectMetricsResponse(
        int totalDocuments,
        int reviewedDocuments,
        int newDocuments
) {

    public static StudentSubjectMetricsResponse fromDomain(StudentSubjectMetrics metrics) {
        return new StudentSubjectMetricsResponse(
                metrics.totalDocuments(),
                metrics.reviewedDocuments(),
                metrics.newDocuments()
        );
    }
}
