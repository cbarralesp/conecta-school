package com.example.authhexagonal.domain.model;

/**
 * Metricas globales del dashboard semestral de planificacion.
 */
public record PlanningSummaryMetrics(
        int totalUnits,
        int totalClasses,
        int publishedClasses,
        int totalDocuments,
        int visibleDocuments,
        int semesterProgressPercent
) {
}
