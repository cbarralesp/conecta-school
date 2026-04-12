package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningSummary;

import java.util.List;

public record PlanningSummaryResponse(
        PlanningSummaryMetricsResponse summary,
        List<PlanningSubjectFilterResponse> subjects,
        List<PlanningSummaryUnitResponse> units
) {

    public static PlanningSummaryResponse fromDomain(PlanningSummary summary) {
        return new PlanningSummaryResponse(
                PlanningSummaryMetricsResponse.fromDomain(summary.summary()),
                summary.subjects().stream().map(PlanningSubjectFilterResponse::fromDomain).toList(),
                summary.units().stream().map(PlanningSummaryUnitResponse::fromDomain).toList()
        );
    }
}
