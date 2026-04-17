package com.example.authhexagonal.domain.model;

public record StudentAttendanceWeekDay(
        String date,
        String dayLabel,
        String status,
        boolean today
) {
}
