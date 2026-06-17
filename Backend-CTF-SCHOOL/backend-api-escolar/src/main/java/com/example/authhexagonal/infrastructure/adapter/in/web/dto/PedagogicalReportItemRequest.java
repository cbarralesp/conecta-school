package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

public record PedagogicalReportItemRequest(
        Long questionId,
        String label,
        String answer
) {
}
