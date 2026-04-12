package com.example.authhexagonal.domain.model;

public record StudentSubjectMetrics(
        int totalDocuments,
        int reviewedDocuments,
        int newDocuments
) {
}
