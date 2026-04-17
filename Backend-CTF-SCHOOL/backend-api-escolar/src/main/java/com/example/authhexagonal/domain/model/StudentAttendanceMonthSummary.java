package com.example.authhexagonal.domain.model;

public record StudentAttendanceMonthSummary(
        String monthLabel,
        int attendancePercentage,
        int presentCount,
        int absentCount,
        int lateCount,
        int recordedDays
) {
}
