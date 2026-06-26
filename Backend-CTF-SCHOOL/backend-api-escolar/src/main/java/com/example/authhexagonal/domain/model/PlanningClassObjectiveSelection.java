package com.example.authhexagonal.domain.model;

import java.util.List;

public record PlanningClassObjectiveSelection(
        String objectiveId,
        String objectiveCode,
        List<String> indicators
) {
}
