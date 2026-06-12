package com.example.authhexagonal.domain.model;

import java.util.List;

public record MonthlyAttendanceView(
        Long courseId,
        String courseName,
        String monthLabel,
        int schoolDays,
        int averageAttendance,
        int studentsAtRisk,
        int totalLate,
        MonthlyAttendanceDistribution distribution,
        List<MonthlyAttendanceDaySummary> dailySummary,
        List<String> suspendedDates,
        List<MonthlyAttendanceSpecialDate> specialDates,
        List<MonthlyAttendanceStudent> students
) {
}
