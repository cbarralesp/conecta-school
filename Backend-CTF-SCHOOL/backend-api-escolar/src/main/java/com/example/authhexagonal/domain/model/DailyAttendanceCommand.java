package com.example.authhexagonal.domain.model;

public record DailyAttendanceCommand(
        Long studentId,
        String status,
        String arrivalTime,
        String note
) {
}
