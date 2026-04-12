package com.example.authhexagonal.domain.model;

public record PlanningObjectiveOption(
        String code,
        String label,
        String description,
        Long unitId
) {
}
