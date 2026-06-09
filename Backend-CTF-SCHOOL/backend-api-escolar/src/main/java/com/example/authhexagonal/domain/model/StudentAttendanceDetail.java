package com.example.authhexagonal.domain.model;

import java.util.List;

public record StudentAttendanceDetail(
        StudentAttendanceHeader header,
        StudentAttendanceSummary summary,
        StudentAttendanceMonthSummary currentMonth,
        List<StudentAttendanceWeekDay> currentWeek,
        List<StudentAttendanceRecord> recentRecords,
        List<StudentAttendanceHistoryDay> historyDays
) {
}
