package com.example.authhexagonal.domain.model;

public record DailyAttendanceSummary(
        int markedCount,
        int progressPercent,
        int presentPercentage,
        int absentPercentage,
        int latePercentage
) {
}
