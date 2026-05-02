package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningClassSuggestion;

public record PlanningClassSuggestionResponse(
        String title,
        String objectiveSummary,
        String startActivity,
        String developmentActivity,
        String closingActivity,
        String diversitySupport,
        String statusMessage,
        String providerUsed
) {
    public static PlanningClassSuggestionResponse fromDomain(PlanningClassSuggestion suggestion) {
        return new PlanningClassSuggestionResponse(
                suggestion.title(),
                suggestion.objectiveSummary(),
                suggestion.startActivity(),
                suggestion.developmentActivity(),
                suggestion.closingActivity(),
                suggestion.diversitySupport(),
                suggestion.statusMessage(),
                suggestion.providerUsed()
        );
    }
}
