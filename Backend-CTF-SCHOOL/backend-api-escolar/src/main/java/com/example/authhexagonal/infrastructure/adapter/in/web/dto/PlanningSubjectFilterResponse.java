package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningSubjectFilter;

public record PlanningSubjectFilterResponse(
        Long id,
        String name
) {

    public static PlanningSubjectFilterResponse fromDomain(PlanningSubjectFilter filter) {
        return new PlanningSubjectFilterResponse(filter.id(), filter.name());
    }
}
