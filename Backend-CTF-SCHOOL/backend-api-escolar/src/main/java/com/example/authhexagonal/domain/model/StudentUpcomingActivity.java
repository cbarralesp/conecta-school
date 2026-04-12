package com.example.authhexagonal.domain.model;

public record StudentUpcomingActivity(
        Long id,
        String title,
        String activityTypeName,
        String date,
        String location
) {
}
