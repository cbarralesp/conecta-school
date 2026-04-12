package com.example.authhexagonal.domain.model;

public record ScheduleCourseOption(
        Long id,
        String code,
        String name,
        int schoolYear,
        String scheduleType
) {
}
