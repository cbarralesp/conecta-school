package com.example.authhexagonal.domain.model;

import java.util.List;

public record PlanningClassSuggestionCommand(
        String subjectName,
        String courseName,
        String unitName,
        String unitType,
        Integer durationMinutes,
        String objectiveCode,
        String objectiveDescription,
        String objectiveType,
        String objectiveAxis,
        List<String> subItems,
        List<String> transversalObjectives,
        List<String> evaluationIndicators,
        List<String> selectedObjectives,
        List<String> selectedObjectiveIndicators
) {
}
