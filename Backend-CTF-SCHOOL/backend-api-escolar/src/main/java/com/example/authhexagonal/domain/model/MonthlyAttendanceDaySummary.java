package com.example.authhexagonal.domain.model;

public record MonthlyAttendanceDaySummary(
        String dayLabel,
        int attendancePercentage
) {
}
