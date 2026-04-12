package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningSummaryMetrics;

public record PlanningSummaryMetricsResponse(
        int totalUnits,
        int totalClasses,
        int publishedClasses,
        int totalDocuments,
        int visibleDocuments,
        int semesterProgressPercent
) {

    public static PlanningSummaryMetricsResponse fromDomain(PlanningSummaryMetrics metrics) {
        return new PlanningSummaryMetricsResponse(
                metrics.totalUnits(),
                metrics.totalClasses(),
                metrics.publishedClasses(),
                metrics.totalDocuments(),
                metrics.visibleDocuments(),
                metrics.semesterProgressPercent()
        );
    }
}
