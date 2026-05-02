package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record PlanningClassSuggestionRequest(
        @NotBlank String subjectName,
        @NotBlank String courseName,
        @NotBlank String objectiveCode,
        @NotBlank String objectiveDescription,
        @NotBlank String objectiveType,
        @NotBlank String objectiveAxis,
        List<String> subItems
) {
}
