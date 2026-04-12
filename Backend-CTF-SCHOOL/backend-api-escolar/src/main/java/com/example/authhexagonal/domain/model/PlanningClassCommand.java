package com.example.authhexagonal.domain.model;

import java.time.LocalDate;

public record PlanningClassCommand(
        Long unitId,
        String durationCode,
        String title,
        LocalDate plannedDate,
        String objectiveCode,
        String evaluationType,
        String objectiveDescription,
        String startActivity,
        String developmentActivity,
        String closingActivity
) {
}
