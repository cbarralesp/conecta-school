package com.example.authhexagonal.domain.model;

import java.util.List;

public record DailyAttendanceView(
        Long courseId,
        String courseName,
        String date,
        int totalStudents,
        int presentCount,
        int absentCount,
        int lateCount,
        DailyAttendanceSummary summary,
        List<DailyAttendanceItem> students
) {
}
