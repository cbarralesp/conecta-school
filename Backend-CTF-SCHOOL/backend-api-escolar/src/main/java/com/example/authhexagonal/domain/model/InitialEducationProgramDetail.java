package com.example.authhexagonal.domain.model;

import java.util.List;

public record InitialEducationProgramDetail(
        Long id,
        String code,
        String grade,
        String visibleSubject,
        String ambit,
        String nucleus,
        Integer totalObjectives,
        String rawJson,
        List<Objective> objectives
) {

    public record Objective(
            String code,
            String description,
            List<String> evaluationIndicators,
            List<Activity> activities
    ) {
    }

    public record Activity(
            Integer number,
            String description
    ) {
    }
}
