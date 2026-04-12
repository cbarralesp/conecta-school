package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentUpcomingActivity;

public record StudentUpcomingActivityResponse(
        Long id,
        String title,
        String activityTypeName,
        String date,
        String location
) {

    public static StudentUpcomingActivityResponse fromDomain(StudentUpcomingActivity activity) {
        return new StudentUpcomingActivityResponse(
                activity.id(),
                activity.title(),
                activity.activityTypeName(),
                activity.date(),
                activity.location()
        );
    }
}
