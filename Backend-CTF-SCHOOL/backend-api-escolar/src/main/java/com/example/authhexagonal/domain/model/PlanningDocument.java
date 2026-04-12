package com.example.authhexagonal.domain.model;

import java.time.LocalDateTime;

/**
 * Vista centralizada de un documento de planificacion.
 */
public record PlanningDocument(
        Long id,
        Long unitId,
        Long classId,
        String originalName,
        String storedName,
        String extension,
        String mimeType,
        long sizeBytes,
        String filePath,
        PlanningDocumentFileType fileType,
        PlanningDocumentOrigin origin,
        PlanningDocumentStatus status,
        boolean visibleToStudents,
        LocalDateTime uploadedAt,
        Long subjectId,
        String subjectName,
        String courseName,
        String unitNumberLabel,
        String unitName,
        String classTitle,
        String createdBy
) {
}
