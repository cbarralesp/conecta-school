package com.example.authhexagonal.domain.model;

import java.util.List;

public record PlanningClassSuggestionCommand(
        String subjectName,
        String courseName,
        String objectiveCode,
        String objectiveDescription,
        String objectiveType,
        String objectiveAxis,
        List<String> subItems
) {
}
