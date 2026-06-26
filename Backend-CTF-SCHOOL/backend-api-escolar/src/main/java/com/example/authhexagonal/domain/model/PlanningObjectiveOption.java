package com.example.authhexagonal.domain.model;

import java.util.List;

public record PlanningObjectiveOption(
        String id,
        String code,
        String label,
        String description,
        Long unitId,
        String axis,
        List<String> skills,
        List<String> attitudes
) {
    public PlanningObjectiveOption(String code, String label, String description, Long unitId) {
        this(null, code, label, description, unitId, "", List.of(), List.of());
    }
}
