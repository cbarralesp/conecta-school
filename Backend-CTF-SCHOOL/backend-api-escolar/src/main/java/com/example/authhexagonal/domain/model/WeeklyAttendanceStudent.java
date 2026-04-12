package com.example.authhexagonal.domain.model;

import java.util.List;

public record WeeklyAttendanceStudent(
        Long studentId,
        String run,
        String fullName,
        List<WeeklyAttendanceDay> days,
        int attendancePercentage,
        String statusBadge,
        int absences,
        int lateCount
) {
}
