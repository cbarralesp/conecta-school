package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.Course;

public record CourseResponse(
        Long id,
        String code,
        String name,
        String level,
        String letter,
        int schoolYear,
        String scheduleType,
        boolean active
) {
    public static CourseResponse fromDomain(Course course) {
        return new CourseResponse(
                course.id(),
                course.code(),
                course.name(),
                course.level(),
                course.letter(),
                course.schoolYear(),
                course.scheduleType(),
                course.active()
        );
    }
}
