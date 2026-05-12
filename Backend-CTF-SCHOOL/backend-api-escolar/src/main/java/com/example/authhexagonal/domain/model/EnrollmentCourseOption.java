package com.example.authhexagonal.domain.model;

public record EnrollmentCourseOption(
        Long id,
        String code,
        String name,
        String level,
        String letter,
        int schoolYear,
        String scheduleType
) {
}
