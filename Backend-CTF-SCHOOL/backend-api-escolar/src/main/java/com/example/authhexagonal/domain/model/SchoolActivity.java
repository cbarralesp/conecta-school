package com.example.authhexagonal.domain.model;

import java.time.LocalDate;
import java.time.LocalTime;

public record SchoolActivity(
        Long id,
        Long activityTypeId,
        Long courseId,
        String courseName,
        String activityTypeCode,
        String activityTypeName,
        String title,
        String description,
        LocalDate date,
        LocalDate endDate,
        LocalTime time,
        String location,
        String backgroundColor,
        String textColor,
        String icon
) {
}
