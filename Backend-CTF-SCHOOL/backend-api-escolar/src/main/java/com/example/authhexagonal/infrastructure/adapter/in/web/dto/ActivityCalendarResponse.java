package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.ActivityCalendar;

import java.util.List;

public record ActivityCalendarResponse(
        int year,
        int month,
        String monthLabel,
        List<SchoolActivityResponse> monthlyActivities,
        List<SchoolActivityResponse> upcomingActivities,
        List<ActivityTypeResponse> activityTypes
) {
    public static ActivityCalendarResponse fromDomain(ActivityCalendar calendar) {
        return new ActivityCalendarResponse(
                calendar.year(),
                calendar.month(),
                calendar.monthLabel(),
                calendar.monthlyActivities().stream().map(SchoolActivityResponse::fromDomain).toList(),
                calendar.upcomingActivities().stream().map(SchoolActivityResponse::fromDomain).toList(),
                calendar.activityTypes().stream().map(ActivityTypeResponse::fromDomain).toList()
        );
    }
}
