package com.example.authhexagonal.domain.model;

import java.time.LocalDate;

public record AttendanceRecordEntry(
        Long studentId,
        LocalDate attendanceDate,
        String status,
        String arrivalTime,
        String note,
        String departureTime,
        String departureReason,
        Boolean departureJustified,
        String departureNote
) {
}
