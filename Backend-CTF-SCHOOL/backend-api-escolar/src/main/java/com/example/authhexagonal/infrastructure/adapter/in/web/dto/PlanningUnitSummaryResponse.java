package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningUnitSummary;

import java.time.LocalDate;

public record PlanningUnitSummaryResponse(
        Long id,
        String unitNumberLabel,
        String name,
        String subjectName,
        String courseName,
        String status,
        LocalDate startDate,
        LocalDate endDate
) {
    public static PlanningUnitSummaryResponse fromDomain(PlanningUnitSummary summary) {
        return new PlanningUnitSummaryResponse(
                summary.id(),
                summary.unitNumberLabel(),
                summary.name(),
                summary.subjectName(),
                summary.courseName(),
                summary.status().name(),
                summary.startDate(),
                summary.endDate()
        );
    }
}
