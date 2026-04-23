package com.example.authhexagonal.domain.model;

import java.util.List;

public record MonthlyAttendanceStudent(
        Long studentId,
        String run,
        String fullName,
        int presentPercentage,
        int absentPercentage,
        int latePercentage,
        String riskStatus,
        int presentCount,
        int absentCount,
        int lateCount,
        List<MonthlyAttendanceStudentDay> days
) {
}
