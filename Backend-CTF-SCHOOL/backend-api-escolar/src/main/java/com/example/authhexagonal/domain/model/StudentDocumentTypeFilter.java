package com.example.authhexagonal.domain.model;

public record StudentDocumentTypeFilter(
        String code,
        String label,
        int count
) {
}
