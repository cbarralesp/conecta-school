package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.ScheduleCourseOption;

public record ScheduleCourseOptionResponse(
        Long id,
        String code,
        String name,
        int schoolYear,
        String scheduleType
) {
    public static ScheduleCourseOptionResponse fromDomain(ScheduleCourseOption course) {
        return new ScheduleCourseOptionResponse(
                course.id(),
                course.code(),
                course.name(),
                course.schoolYear(),
                course.scheduleType()
        );
    }
}
