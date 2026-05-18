package com.example.authhexagonal.domain.model;

public record StudyProgramSummary(
        Long id,
        String code,
        String subject,
        String grade,
        String decree,
        String source,
        String edition,
        Integer totalUnits,
        Integer totalObjectives,
        Integer totalHours
) {
}
