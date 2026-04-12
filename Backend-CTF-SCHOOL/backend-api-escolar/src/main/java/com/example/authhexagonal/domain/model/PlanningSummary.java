package com.example.authhexagonal.domain.model;

import java.util.List;

/**
 * Respuesta agregada del resumen semestral de planificacion.
 */
public record PlanningSummary(
        PlanningSummaryMetrics summary,
        List<PlanningSubjectFilter> subjects,
        List<PlanningSummaryUnit> units
) {
}
