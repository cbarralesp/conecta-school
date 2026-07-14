package com.example.authhexagonal.domain.model;

public record StudentAttendanceRecord(
        String date,
        String status,
        String timeLabel,
        String note,
        String departureTime,
        String departureReason,
        Boolean departureJustified,
        String departureNote
) {
}
