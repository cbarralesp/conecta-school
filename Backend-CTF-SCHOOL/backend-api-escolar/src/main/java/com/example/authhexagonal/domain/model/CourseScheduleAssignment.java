package com.example.authhexagonal.domain.model;

public record CourseScheduleAssignment(
        Long id,
        Long courseId,
        String courseName,
        String teacherFullName,
        String dayOfWeek,
        String startTime,
        String endTime
) {
}
