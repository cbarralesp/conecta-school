package com.example.authhexagonal.domain.model;

public record WeeklyAttendanceSummary(
        int averageAttendance,
        int totalAbsences,
        int totalLate,
        int activeAlerts
) {
}
