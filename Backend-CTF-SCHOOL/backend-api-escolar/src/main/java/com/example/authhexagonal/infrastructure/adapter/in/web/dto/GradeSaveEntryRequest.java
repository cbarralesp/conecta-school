package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

public record GradeSaveEntryRequest(
        Long studentId,
        Long evaluationId,
        Double score,
        String conceptCode,
        Double percentage
) {
}
