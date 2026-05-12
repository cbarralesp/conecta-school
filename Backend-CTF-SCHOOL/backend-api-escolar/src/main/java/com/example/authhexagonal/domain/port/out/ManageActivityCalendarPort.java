package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.ActivityType;
import com.example.authhexagonal.domain.model.SchoolActivity;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface ManageActivityCalendarPort {

    List<ActivityType> findActiveTypes();

    Optional<ActivityType> findActiveTypeById(Long activityTypeId);

    Optional<SchoolActivity> findActiveById(Long activityId);

    List<SchoolActivity> findActivitiesForRange(LocalDate startDate, LocalDate endDate, Long courseId);

    List<SchoolActivity> findUpcomingActivities(LocalDate startDate, int limit, Long courseId);

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

    void deactivateActivity(Long activityId);
}
