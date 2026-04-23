package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.ActivityCalendar;

import java.util.List;

public record ActivityCalendarResponse(
        int year,
        int month,
        String monthLabel,
        ActivityCalendarSummaryResponse summary,
        List<ActivityCalendarDayResponse> days,
        List<SchoolActivityResponse> monthlyActivities,
        List<SchoolActivityResponse> upcomingActivities,
        List<ActivityTypeResponse> activityTypes
) {
    public static ActivityCalendarResponse fromDomain(ActivityCalendar calendar) {
        return new ActivityCalendarResponse(
                calendar.year(),
                calendar.month(),
                calendar.monthLabel(),
                ActivityCalendarSummaryResponse.fromDomain(calendar.summary()),
                calendar.days().stream().map(ActivityCalendarDayResponse::fromDomain).toList(),
                calendar.monthlyActivities().stream().map(SchoolActivityResponse::fromDomain).toList(),
                calendar.upcomingActivities().stream().map(SchoolActivityResponse::fromDomain).toList(),
                calendar.activityTypes().stream().map(ActivityTypeResponse::fromDomain).toList()
        );
    }
}
