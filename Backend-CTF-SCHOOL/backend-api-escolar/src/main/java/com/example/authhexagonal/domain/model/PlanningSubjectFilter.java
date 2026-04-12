package com.example.authhexagonal.domain.model;

/**
 * Filtro disponible para segmentar el resumen semestral por asignatura.
 */
public record PlanningSubjectFilter(
        Long id,
        String name
) {
}
