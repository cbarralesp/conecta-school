package com.example.authhexagonal.domain.model;

public record DailyAttendanceItem(
        Long studentId,
        String run,
        String fullName,
        String status,
        String arrivalTime,
        String note
) {
}
