package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningOptionItem;

public record PlanningOptionItemResponse(
        String code,
        String label
) {
    public static PlanningOptionItemResponse fromDomain(PlanningOptionItem item) {
        return new PlanningOptionItemResponse(item.code(), item.label());
    }
}
