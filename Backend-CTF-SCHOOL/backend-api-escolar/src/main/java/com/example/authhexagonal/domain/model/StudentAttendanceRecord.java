package com.example.authhexagonal.domain.model;

public record StudentAttendanceRecord(
        String date,
        String status,
        String timeLabel,
        String note
) {
}
