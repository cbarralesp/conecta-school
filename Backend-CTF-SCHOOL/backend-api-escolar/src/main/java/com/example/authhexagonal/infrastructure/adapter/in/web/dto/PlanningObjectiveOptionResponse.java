package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningObjectiveOption;

import java.util.List;

public record PlanningObjectiveOptionResponse(
        String id,
        String code,
        String label,
        String description,
        Long unitId,
        String axis,
        List<String> skills,
        List<String> attitudes
) {
    public static PlanningObjectiveOptionResponse fromDomain(PlanningObjectiveOption option) {
        return new PlanningObjectiveOptionResponse(
                option.id(),
                option.code(),
                option.label(),
                option.description(),
                option.unitId(),
                option.axis(),
                option.skills(),
                option.attitudes()
        );
    }
}
