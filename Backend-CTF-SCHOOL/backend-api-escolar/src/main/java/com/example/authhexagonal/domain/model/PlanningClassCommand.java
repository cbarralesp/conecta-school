package com.example.authhexagonal.domain.model;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

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
        String closingActivity,
        List<UUID> objectiveIds,
        List<PlanningClassObjectiveSelection> objectiveSelections
) {
}
