package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import java.util.List;

public record PlanningClassObjectiveSelectionRequest(
        String objectiveId,
        String objectiveCode,
        List<String> indicators
) {
}
