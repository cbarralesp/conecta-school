package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningObjectiveOption;

public record PlanningObjectiveOptionResponse(
        String code,
        String label,
        String description,
        Long unitId
) {
    public static PlanningObjectiveOptionResponse fromDomain(PlanningObjectiveOption option) {
        return new PlanningObjectiveOptionResponse(
                option.code(),
                option.label(),
                option.description(),
                option.unitId()
        );
    }
}
