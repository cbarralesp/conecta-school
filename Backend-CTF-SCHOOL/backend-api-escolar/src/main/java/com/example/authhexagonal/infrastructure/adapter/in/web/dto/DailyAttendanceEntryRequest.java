package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

public record DailyAttendanceEntryRequest(
        Long studentId,
        String status,
        String arrivalTime,
        String note
) {
}
