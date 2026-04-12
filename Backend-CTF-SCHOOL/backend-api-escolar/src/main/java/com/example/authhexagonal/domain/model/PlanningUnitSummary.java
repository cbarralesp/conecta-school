package com.example.authhexagonal.domain.model;

import java.time.LocalDate;

public record PlanningUnitSummary(
        Long id,
        String unitNumberLabel,
        String name,
        String subjectName,
        String courseName,
        PlanningUnitStatus status,
        LocalDate startDate,
        LocalDate endDate
) {
}
