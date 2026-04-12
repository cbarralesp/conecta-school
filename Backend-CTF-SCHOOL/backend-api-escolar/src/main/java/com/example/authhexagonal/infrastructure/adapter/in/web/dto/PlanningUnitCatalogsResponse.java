package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningUnitCatalogs;

import java.util.List;

public record PlanningUnitCatalogsResponse(
        List<PlanningUnitCatalogAssignmentResponse> teachingAssignments,
        List<PlanningOptionItemResponse> unitNumbers,
        List<PlanningOptionItemResponse> weekOptions
) {
    public static PlanningUnitCatalogsResponse fromDomain(PlanningUnitCatalogs catalogs) {
        return new PlanningUnitCatalogsResponse(
                catalogs.teachingAssignments().stream()
                        .map(PlanningUnitCatalogAssignmentResponse::fromDomain)
                        .toList(),
                catalogs.unitNumbers().stream()
                        .map(PlanningOptionItemResponse::fromDomain)
                        .toList(),
                catalogs.weekOptions().stream()
                        .map(PlanningOptionItemResponse::fromDomain)
                        .toList()
        );
    }
}
