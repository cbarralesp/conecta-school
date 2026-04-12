package com.example.authhexagonal.domain.model;

import java.util.List;

public record PlanningClassCatalogs(
        List<PlanningClassCatalogUnit> units,
        List<PlanningObjectiveOption> objectives,
        List<PlanningOptionItem> evaluationTypes,
        List<PlanningOptionItem> durationOptions
) {
}
