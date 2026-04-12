package com.example.authhexagonal.domain.model;

public record GradePeriodOption(
        Long id,
        String name,
        int schoolYear,
        int semester
) {
}
