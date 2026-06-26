package com.example.authhexagonal.domain.model;

import java.util.List;

public record PlanningClassSuggestion(
        String title,
        String objectiveSummary,
        String startActivity,
        String developmentActivity,
        String closingActivity,
        List<String> indicatorsCovered,
        String diversitySupport,
        String statusMessage,
        String providerUsed
) {
}
