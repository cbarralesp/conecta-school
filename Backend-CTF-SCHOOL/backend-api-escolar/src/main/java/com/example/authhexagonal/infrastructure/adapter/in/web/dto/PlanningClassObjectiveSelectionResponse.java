package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningClassObjectiveSelection;

import java.util.List;

public record PlanningClassObjectiveSelectionResponse(
        String objectiveId,
        String objectiveCode,
        List<String> indicators
) {
    public static PlanningClassObjectiveSelectionResponse fromDomain(PlanningClassObjectiveSelection selection) {
        return new PlanningClassObjectiveSelectionResponse(
                selection.objectiveId(),
                selection.objectiveCode(),
                selection.indicators()
        );
    }
}
