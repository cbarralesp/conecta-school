package com.example.authhexagonal.domain.model;

public record TeacherScheduleItem(
        String dayOfWeek,
        String startTime,
        String endTime,
        String courseName,
        String subjectName,
        String room
) {
}
