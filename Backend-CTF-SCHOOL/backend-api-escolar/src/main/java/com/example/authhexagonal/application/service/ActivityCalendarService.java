package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.ActivityCalendar;
import com.example.authhexagonal.domain.model.SchoolActivity;
import com.example.authhexagonal.domain.port.in.ManageActivityCalendarUseCase;
import com.example.authhexagonal.domain.port.out.ManageActivityCalendarPort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

@Service
public class ActivityCalendarService implements ManageActivityCalendarUseCase {

    private static final Locale SPANISH = Locale.forLanguageTag("es-CL");

    private final ManageActivityCalendarPort manageActivityCalendarPort;

    public ActivityCalendarService(ManageActivityCalendarPort manageActivityCalendarPort) {
        this.manageActivityCalendarPort = manageActivityCalendarPort;
    }

    @Override
    public ActivityCalendar getMonthlyCalendar(int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        return new ActivityCalendar(
                year,
                month,
                capitalize(yearMonth.getMonth().getDisplayName(TextStyle.FULL, SPANISH)) + " " + year,
                manageActivityCalendarPort.findActivitiesForRange(startDate, endDate),
                manageActivityCalendarPort.findUpcomingActivities(LocalDate.now(), 6),
                manageActivityCalendarPort.findActiveTypes()
        );
    }

    @Override
    public SchoolActivity findById(Long activityId) {
        return manageActivityCalendarPort.findActiveById(activityId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found"));
    }

    @Override
    public SchoolActivity createActivity(
            Long activityTypeId,
            String title,
            String description,
            LocalDate date,
            LocalDate endDate,
            LocalTime time,
            String location
    ) {
        manageActivityCalendarPort.findActiveTypeById(activityTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity type not found"));

        LocalDate effectiveEndDate = endDate == null ? date : endDate;
        if (effectiveEndDate.isBefore(date)) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }

        return manageActivityCalendarPort.createActivity(
                activityTypeId,
                title,
                description,
                date,
                effectiveEndDate,
                time,
                location
        );
    }

    @Override
    public SchoolActivity updateActivity(
            Long activityId,
            Long activityTypeId,
            String title,
            String description,
            LocalDate date,
            LocalDate endDate,
            LocalTime time,
            String location
    ) {
        findById(activityId);
        manageActivityCalendarPort.findActiveTypeById(activityTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity type not found"));

        LocalDate effectiveEndDate = endDate == null ? date : endDate;
        if (effectiveEndDate.isBefore(date)) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }

        return manageActivityCalendarPort.updateActivity(
                activityId,
                activityTypeId,
                title,
                description,
                date,
                effectiveEndDate,
                time,
                location
        );
    }

    @Override
    public void deleteActivity(Long activityId) {
        findById(activityId);
        manageActivityCalendarPort.deactivateActivity(activityId);
    }

    private String capitalize(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value.substring(0, 1).toUpperCase(SPANISH) + value.substring(1);
    }
}
