package com.example.authhexagonal.domain.model;

public record PlanningClassSuggestion(
        String title,
        String objectiveSummary,
        String startActivity,
        String developmentActivity,
        String closingActivity,
        String diversitySupport,
        String statusMessage,
        String providerUsed
) {
}
