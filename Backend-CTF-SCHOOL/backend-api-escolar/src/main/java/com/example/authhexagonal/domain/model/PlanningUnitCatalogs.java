package com.example.authhexagonal.domain.model;

import java.util.List;

public record PlanningUnitCatalogs(
        List<PlanningUnitCatalogAssignment> teachingAssignments,
        List<PlanningOptionItem> unitNumbers,
        List<PlanningOptionItem> weekOptions
) {
}
