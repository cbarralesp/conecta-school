package com.example.authhexagonal.domain.model;

public record SchedulePeriodOption(
        Long id,
        String name,
        int schoolYear,
        int semester
) {
}
