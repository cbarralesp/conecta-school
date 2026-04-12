package com.example.authhexagonal.domain.model;

import java.util.List;

public record ActivityCalendar(
        int year,
        int month,
        String monthLabel,
        List<SchoolActivity> monthlyActivities,
        List<SchoolActivity> upcomingActivities,
        List<ActivityType> activityTypes
) {
}
