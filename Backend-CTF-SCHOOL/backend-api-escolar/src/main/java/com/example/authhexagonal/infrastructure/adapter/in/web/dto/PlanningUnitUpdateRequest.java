package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;

public record PlanningUnitUpdateRequest(
        @NotBlank String unitNumber,
        @NotBlank String name
) {
}
