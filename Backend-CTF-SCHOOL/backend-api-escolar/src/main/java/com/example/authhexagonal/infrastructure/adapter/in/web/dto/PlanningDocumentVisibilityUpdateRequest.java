package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotNull;

public record PlanningDocumentVisibilityUpdateRequest(
        @NotNull Boolean visibleToStudents
) {
}
