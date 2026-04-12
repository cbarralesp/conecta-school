package com.example.authhexagonal.domain.model;

/**
 * Filtros opcionales del resumen semestral de planificacion.
 */
public record PlanningSummaryFilter(
        Long subjectId,
        Integer year
) {
}
