package com.example.authhexagonal.domain.model;

public record MonthlyAttendanceDistribution(
        int presentCount,
        int presentPercentage,
        int absentCount,
        int absentPercentage,
        int lateCount,
        int latePercentage
) {
}
