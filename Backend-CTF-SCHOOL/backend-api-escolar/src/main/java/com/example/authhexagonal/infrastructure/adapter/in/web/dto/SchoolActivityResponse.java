package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.SchoolActivity;

import java.time.LocalDate;
import java.time.LocalTime;

public record SchoolActivityResponse(
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
    public static SchoolActivityResponse fromDomain(SchoolActivity activity) {
        return new SchoolActivityResponse(
                activity.id(),
                activity.activityTypeId(),
                activity.courseId(),
                activity.courseName(),
                activity.activityTypeCode(),
                activity.activityTypeName(),
                activity.title(),
                activity.description(),
                activity.date(),
                activity.endDate(),
                activity.time(),
                activity.location(),
                activity.backgroundColor(),
                activity.textColor(),
                activity.icon()
        );
    }
}
