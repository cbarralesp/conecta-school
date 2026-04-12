package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.PlanningDocument;

public record PlanningDocumentResponse(
        Long id,
        Long unitId,
        Long classId,
        String originalName,
        String storedName,
        String extension,
        String mimeType,
        long sizeBytes,
        String fileType,
        String origin,
        boolean visibleToStudents,
        String uploadedAt,
        Long subjectId,
        String subjectName,
        String courseName,
        String unitNumberLabel,
        String unitName,
        String classTitle,
        String createdBy
) {

    public static PlanningDocumentResponse fromDomain(PlanningDocument document) {
        return new PlanningDocumentResponse(
                document.id(),
                document.unitId(),
                document.classId(),
                document.originalName(),
                document.storedName(),
                document.extension(),
                document.mimeType(),
                document.sizeBytes(),
                document.fileType().name(),
                document.origin().name(),
                document.visibleToStudents(),
                document.uploadedAt().toString(),
                document.subjectId(),
                document.subjectName(),
                document.courseName(),
                document.unitNumberLabel(),
                document.unitName(),
                document.classTitle(),
                document.createdBy()
        );
    }
}
