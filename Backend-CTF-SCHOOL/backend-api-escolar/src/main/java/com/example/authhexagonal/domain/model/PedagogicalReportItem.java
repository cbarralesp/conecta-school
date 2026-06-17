package com.example.authhexagonal.domain.model;

public record PedagogicalReportItem(
        Long questionId,
        String label,
        String answer,
        Boolean achieved
) {
}
