package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningClassDocument;

import java.time.LocalDateTime;

public record PlanningClassDocumentResponse(
        Long id,
        Long classId,
        String originalName,
        String storedName,
        String extension,
        String mimeType,
        long sizeBytes,
        String filePath,
        String fileType,
        boolean visibleToStudents,
        LocalDateTime uploadedAt
) {
    public static PlanningClassDocumentResponse fromDomain(PlanningClassDocument document) {
        return new PlanningClassDocumentResponse(
                document.id(),
                document.classId(),
                document.originalName(),
                document.storedName(),
                document.extension(),
                document.mimeType(),
                document.sizeBytes(),
                document.filePath(),
                document.fileType().name(),
                document.visibleToStudents(),
                document.uploadedAt()
        );
    }
}
