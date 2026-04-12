package com.example.authhexagonal.domain.model;

public record PlanningClassDocumentUploadCommand(
        String originalName,
        String mimeType,
        long sizeBytes,
        byte[] content,
        boolean visibleToStudents
) {
}
