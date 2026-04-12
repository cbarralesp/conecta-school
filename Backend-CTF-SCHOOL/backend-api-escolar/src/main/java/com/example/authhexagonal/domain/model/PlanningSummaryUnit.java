package com.example.authhexagonal.domain.model;

/**
 * Fila resumida de unidad dentro del dashboard semestral.
 */
public record PlanningSummaryUnit(
        Long id,
        String code,
        String name,
        Long subjectId,
        String subjectName,
        String courseName,
        int plannedClasses,
        int totalClasses,
        int publishedClasses,
        int totalDocuments,
        String weekRange,
        int progressPercent,
        PlanningSummaryStatus status
) {
}
