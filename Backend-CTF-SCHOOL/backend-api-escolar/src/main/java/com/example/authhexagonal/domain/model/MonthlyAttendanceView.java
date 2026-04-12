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
        List<MonthlyAttendanceStudent> students
) {
}
