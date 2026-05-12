package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.ActivityCalendar;
import com.example.authhexagonal.domain.model.SchoolActivity;

import java.time.LocalDate;
import java.time.LocalTime;

public interface ManageActivityCalendarUseCase {

    ActivityCalendar getMonthlyCalendar(int year, int month, Long courseId);

    SchoolActivity findById(Long activityId);

    SchoolActivity createActivity(
            Long activityTypeId,
            Long courseId,
            String title,
            String description,
            LocalDate date,
            LocalDate endDate,
            LocalTime time,
            String location
    );

    SchoolActivity updateActivity(
            Long activityId,
            Long activityTypeId,
            Long courseId,
            String title,
            String description,
            LocalDate date,
            LocalDate endDate,
            LocalTime time,
            String location
    );

    void deleteActivity(Long activityId);
}
