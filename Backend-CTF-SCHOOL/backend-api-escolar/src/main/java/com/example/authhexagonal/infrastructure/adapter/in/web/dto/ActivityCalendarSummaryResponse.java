package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.ActivityCalendarSummary;

public record ActivityCalendarSummaryResponse(
        int total,
        int thisMonth,
        int upcoming,
        int completed
) {
    public static ActivityCalendarSummaryResponse fromDomain(ActivityCalendarSummary summary) {
        return new ActivityCalendarSummaryResponse(
                summary.total(),
                summary.thisMonth(),
                summary.upcoming(),
                summary.completed()
        );
    }
}
