package com.example.authhexagonal.domain.model;

import java.time.LocalDate;

/**
 * Fila resumida de unidad dentro del dashboard semestral.
 */
public record PlanningSummaryUnit(
        Long id,
        String code,
        String name,
        String unitColorHex,
        Long subjectId,
        String subjectName,
        String subjectColorHex,
        String courseName,
        int plannedClasses,
        int totalClasses,
        int publishedClasses,
        int totalDocuments,
        LocalDate startDate,
        LocalDate endDate,
        String weekRange,
        int progressPercent,
        PlanningSummaryStatus status
) {
}
