package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

public record PlanningDocumentDeleteResponse(
        Long id,
        String status,
        String message
) {
}
