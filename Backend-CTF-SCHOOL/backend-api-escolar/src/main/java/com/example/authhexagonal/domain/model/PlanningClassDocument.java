package com.example.authhexagonal.domain.model;

import java.time.LocalDateTime;

public record PlanningClassDocument(
        Long id,
        Long classId,
        String originalName,
        String storedName,
        String extension,
        String mimeType,
        long sizeBytes,
        String filePath,
        PlanningDocumentFileType fileType,
        boolean visibleToStudents,
        LocalDateTime uploadedAt
) {
}
