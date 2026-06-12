package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.ActivityCalendar;
import com.example.authhexagonal.domain.model.ActivityCalendarDay;
import com.example.authhexagonal.domain.model.ActivityCalendarSummary;
import com.example.authhexagonal.domain.model.ActivityType;
import com.example.authhexagonal.domain.model.SchoolActivity;
import com.example.authhexagonal.domain.port.in.ManageActivityCalendarUseCase;
import com.example.authhexagonal.domain.port.out.ManageActivityCalendarPort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
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
    public ActivityCalendar getMonthlyCalendar(int year, int month, Long courseId) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();
        LocalDate today = LocalDate.now();
        List<SchoolActivity> monthlyActivities = manageActivityCalendarPort.findActivitiesForRange(startDate, endDate, courseId);
        List<SchoolActivity> upcomingActivities = manageActivityCalendarPort.findUpcomingActivities(today, 6, courseId);

        return new ActivityCalendar(
                year,
                month,
                capitalize(yearMonth.getMonth().getDisplayName(TextStyle.FULL, SPANISH)) + " " + year,
                new ActivityCalendarSummary(
                        monthlyActivities.size(),
                        monthlyActivities.size(),
                        upcomingActivities.size(),
                        (int) monthlyActivities.stream()
                                .filter(activity -> resolveActivityStatus(activity, today) == ActivityStatus.DONE)
                                .count()
                ),
                buildDays(yearMonth, monthlyActivities, today),
                monthlyActivities,
                upcomingActivities,
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
            Long courseId,
            String title,
            String description,
            LocalDate date,
            LocalDate endDate,
            LocalTime time,
            String location
    ) {
        ActivityType activityType = manageActivityCalendarPort.findActiveTypeById(activityTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity type not found"));

        LocalDate effectiveEndDate = endDate == null ? date : endDate;
        if (effectiveEndDate.isBefore(date)) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }

        return manageActivityCalendarPort.createActivity(
                activityTypeId,
                resolveCourseScope(activityType, courseId),
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
            Long courseId,
            String title,
            String description,
            LocalDate date,
            LocalDate endDate,
            LocalTime time,
            String location
    ) {
        findById(activityId);
        ActivityType activityType = manageActivityCalendarPort.findActiveTypeById(activityTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity type not found"));

        LocalDate effectiveEndDate = endDate == null ? date : endDate;
        if (effectiveEndDate.isBefore(date)) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }

        return manageActivityCalendarPort.updateActivity(
                activityId,
                activityTypeId,
                resolveCourseScope(activityType, courseId),
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

    private Long resolveCourseScope(ActivityType activityType, Long courseId) {
        if (activityType == null || activityType.code() == null) {
            return courseId;
        }

        String code = activityType.code().trim().toUpperCase(SPANISH);
        if ("TRANSVERSAL".equals(code) || "VACACIONES".equals(code) || "FERIADO".equals(code) || "INTERFERIADO".equals(code) || "SUSPENSION".equals(code)) {
            return null;
        }
        return courseId;
    }

    private List<ActivityCalendarDay> buildDays(YearMonth yearMonth, List<SchoolActivity> monthlyActivities, LocalDate today) {
        LocalDate firstDay = yearMonth.atDay(1);
        LocalDate lastDay = yearMonth.atEndOfMonth();
        int startOffset = firstDay.getDayOfWeek().getValue() - 1;
        LocalDate startDate = firstDay.minusDays(startOffset);
        int endOffset = 7 - lastDay.getDayOfWeek().getValue();
        LocalDate endDate = lastDay.plusDays(endOffset);

        List<ActivityCalendarDay> days = new ArrayList<>();
        for (LocalDate cursor = startDate; !cursor.isAfter(endDate); cursor = cursor.plusDays(1)) {
            LocalDate currentDate = cursor;
            days.add(new ActivityCalendarDay(
                    currentDate.toString(),
                    currentDate.getDayOfMonth(),
                    currentDate.getMonthValue() == yearMonth.getMonthValue(),
                    currentDate.equals(today),
                    monthlyActivities.stream()
                            .filter(activity -> activityCoversDay(activity, currentDate))
                            .toList()
            ));
        }
        return days;
    }

    private boolean activityCoversDay(SchoolActivity activity, LocalDate date) {
        LocalDate endDate = activity.endDate() == null ? activity.date() : activity.endDate();
        return !activity.date().isAfter(date) && !endDate.isBefore(date);
    }

    private ActivityStatus resolveActivityStatus(SchoolActivity activity, LocalDate today) {
        LocalDate endDate = activity.endDate() == null ? activity.date() : activity.endDate();
        if (activity.date().isAfter(today)) {
            return ActivityStatus.UPCOMING;
        }
        if (endDate.isBefore(today)) {
            return ActivityStatus.DONE;
        }
        return ActivityStatus.IN_PROGRESS;
    }

    private enum ActivityStatus {
        UPCOMING,
        IN_PROGRESS,
        DONE
    }
}
