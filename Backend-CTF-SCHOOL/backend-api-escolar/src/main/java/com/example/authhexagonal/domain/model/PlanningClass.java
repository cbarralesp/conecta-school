package com.example.authhexagonal.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PlanningClass(
        Long id,
        Long unitId,
        Long subjectId,
        String subjectName,
        Long courseId,
        String courseName,
        String unitNumberLabel,
        String unitName,
        String title,
        LocalDate plannedDate,
        String durationCode,
        String durationLabel,
        String objectiveCode,
        String objectiveTitle,
        String objectiveDescription,
        PlanningEvaluationType evaluationType,
        String startActivity,
        String developmentActivity,
        String closingActivity,
        PlanningClassStatus status,
        boolean publishedToStudents,
        String createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<PlanningClassDocument> documents,
        List<UUID> curriculumObjectiveIds,
        List<CurriculumObjective> curriculumObjectives,
        List<PlanningClassObjectiveSelection> objectiveSelections
) {
}
