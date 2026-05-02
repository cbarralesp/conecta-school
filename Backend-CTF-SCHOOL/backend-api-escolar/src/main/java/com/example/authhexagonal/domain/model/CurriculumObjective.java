package com.example.authhexagonal.domain.model;

import java.util.List;
import java.util.UUID;

public record CurriculumObjective(
        UUID id,
        UUID gradeId,
        String codigo,
        String tipo,
        String eje,
        String descripcion,
        List<String> subItems,
        List<String> suggestedSkills,
        List<String> suggestedAttitudes,
        List<String> suggestedResources,
        String suggestedDiversityNote,
        String suggestedEvaluationType,
        String suggestedLearningApproach,
        String suggestedInstrument
) {
    public CurriculumObjective(
            UUID id,
            UUID gradeId,
            String codigo,
            String tipo,
            String eje,
            String descripcion,
            List<String> subItems
    ) {
        this(
                id,
                gradeId,
                codigo,
                tipo,
                eje,
                descripcion,
                subItems,
                List.of(),
                List.of(),
                List.of(),
                "",
                "",
                "",
                ""
        );
    }
}
