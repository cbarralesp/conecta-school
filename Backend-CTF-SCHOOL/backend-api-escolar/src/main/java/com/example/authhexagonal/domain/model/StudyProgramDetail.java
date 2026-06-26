package com.example.authhexagonal.domain.model;

import java.util.List;

public record StudyProgramDetail(
        Long id,
        String code,
        String subject,
        String grade,
        String decree,
        String source,
        String isbn,
        String edition,
        Integer totalUnits,
        Integer totalObjectives,
        Integer totalHours,
        String permanentObjectivesDescription,
        String rawJson,
        List<String> axes,
        List<Attitude> globalAttitudes,
        List<ObjectiveCatalogItem> objectiveCatalog,
        List<ObjectiveDetail> permanentObjectives,
        List<Unit> units
) {

    public record Attitude(
            String code,
            String description
    ) {
    }

    public record ObjectiveCatalogItem(
            String code,
            String axis,
            String description,
            List<String> subItems
    ) {
    }

    public record ObjectiveDetail(
            String code,
            String axis,
            String description,
            List<String> subItems,
            List<String> evaluationIndicators,
            List<Activity> activities
    ) {
    }

    public record Activity(
            Integer number,
            String title,
            String description,
            String teacherNote,
            String skills,
            String interdisciplinarity
    ) {
    }

    public record Reading(
            String category,
            String title,
            String author
    ) {
    }

    public record EvaluationExample(
            Integer number,
            String objectiveCode,
            String evaluatedIndicators,
            String activityDescription,
            String evaluationCriteria
    ) {
    }

    public record Unit(
            Integer number,
            String name,
            Integer semester,
            Integer estimatedHours,
            String generalPurpose,
            String priorKnowledge,
            String keywords,
            String knowledge,
            String rawJson,
            String readingPurpose,
            String writingPurpose,
            String oralCommunicationPurpose,
            List<Attitude> attitudes,
            List<Reading> suggestedReadings,
            List<ObjectiveDetail> objectives,
            List<EvaluationExample> evaluationExamples
    ) {
    }
}
