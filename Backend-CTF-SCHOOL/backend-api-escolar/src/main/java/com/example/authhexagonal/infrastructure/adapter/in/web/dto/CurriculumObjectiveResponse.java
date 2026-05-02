package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.CurriculumObjective;

import java.util.List;
import java.util.UUID;

public record CurriculumObjectiveResponse(
        UUID id,
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
    public static CurriculumObjectiveResponse fromDomain(CurriculumObjective objective) {
        return new CurriculumObjectiveResponse(
                objective.id(),
                objective.codigo(),
                objective.tipo(),
                objective.eje(),
                objective.descripcion(),
                objective.subItems(),
                objective.suggestedSkills(),
                objective.suggestedAttitudes(),
                objective.suggestedResources(),
                objective.suggestedDiversityNote(),
                objective.suggestedEvaluationType(),
                objective.suggestedLearningApproach(),
                objective.suggestedInstrument()
        );
    }
}
