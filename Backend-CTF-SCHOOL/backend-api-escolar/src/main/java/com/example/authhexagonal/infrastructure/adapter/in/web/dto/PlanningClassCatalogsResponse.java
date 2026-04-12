package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningClassCatalogs;

import java.util.List;

public record PlanningClassCatalogsResponse(
        List<PlanningClassCatalogUnitResponse> units,
        List<PlanningObjectiveOptionResponse> objectives,
        List<PlanningOptionItemResponse> evaluationTypes,
        List<PlanningOptionItemResponse> durationOptions
) {
    public static PlanningClassCatalogsResponse fromDomain(PlanningClassCatalogs catalogs) {
        return new PlanningClassCatalogsResponse(
                catalogs.units().stream().map(PlanningClassCatalogUnitResponse::fromDomain).toList(),
                catalogs.objectives().stream().map(PlanningObjectiveOptionResponse::fromDomain).toList(),
                catalogs.evaluationTypes().stream().map(PlanningOptionItemResponse::fromDomain).toList(),
                catalogs.durationOptions().stream().map(PlanningOptionItemResponse::fromDomain).toList()
        );
    }
}
