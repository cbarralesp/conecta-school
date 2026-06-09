package com.example.authhexagonal.domain.model;

public record StudentScheduleItem(
        String dayOfWeek,
        String startTime,
        String endTime,
        String courseName,
        String subjectName,
        String room,
        String subjectColorHex
) {
}
