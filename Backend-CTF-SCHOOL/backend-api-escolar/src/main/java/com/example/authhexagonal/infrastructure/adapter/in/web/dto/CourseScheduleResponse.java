package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.CourseScheduleAssignment;

public record CourseScheduleResponse(
        Long id,
        Long courseId,
        String courseName,
        String teacherFullName,
        String dayOfWeek,
        String startTime,
        String endTime
) {
    public static CourseScheduleResponse fromDomain(CourseScheduleAssignment assignment) {
        return new CourseScheduleResponse(
                assignment.id(),
                assignment.courseId(),
                assignment.courseName(),
                assignment.teacherFullName(),
                assignment.dayOfWeek(),
                assignment.startTime(),
                assignment.endTime()
        );
    }
}
