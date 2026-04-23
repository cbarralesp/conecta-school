package com.example.authhexagonal.domain.model;

import java.util.List;

public record WeeklyAttendanceView(
        Long courseId,
        String courseName,
        String weekLabel,
        List<String> dates,
        WeeklyAttendanceSummary summary,
        List<WeeklyAttendanceStudent> students,
        List<AttendanceAlert> alerts
) {
}
