package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningClass;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PlanningClassResponse(
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
        String evaluationType,
        String startActivity,
        String developmentActivity,
        String closingActivity,
        String status,
        boolean publishedToStudents,
        String createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<PlanningClassDocumentResponse> documents,
        List<UUID> objectiveIds,
        List<CurriculumObjectiveResponse> curriculumObjectives,
        List<PlanningClassObjectiveSelectionResponse> objectiveSelections
) {
    public static PlanningClassResponse fromDomain(PlanningClass planningClass) {
        return new PlanningClassResponse(
                planningClass.id(),
                planningClass.unitId(),
                planningClass.subjectId(),
                planningClass.subjectName(),
                planningClass.courseId(),
                planningClass.courseName(),
                planningClass.unitNumberLabel(),
                planningClass.unitName(),
                planningClass.title(),
                planningClass.plannedDate(),
                planningClass.durationCode(),
                planningClass.durationLabel(),
                planningClass.objectiveCode(),
                planningClass.objectiveTitle(),
                planningClass.objectiveDescription(),
                planningClass.evaluationType().name(),
                planningClass.startActivity(),
                planningClass.developmentActivity(),
                planningClass.closingActivity(),
                planningClass.status().name(),
                planningClass.publishedToStudents(),
                planningClass.createdBy(),
                planningClass.createdAt(),
                planningClass.updatedAt(),
                planningClass.documents().stream().map(PlanningClassDocumentResponse::fromDomain).toList(),
                planningClass.curriculumObjectiveIds(),
                planningClass.curriculumObjectives().stream().map(CurriculumObjectiveResponse::fromDomain).toList(),
                planningClass.objectiveSelections().stream().map(PlanningClassObjectiveSelectionResponse::fromDomain).toList()
        );
    }
}
