package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentDocument;

public record EnrollmentDocumentResponse(
        Long id,
        String documentKey,
        String fileName,
        String storageProvider,
        String storageKey,
        String driveFileId,
        String driveUrl,
        String mimeType,
        Long sizeBytes
) {
    public static EnrollmentDocumentResponse fromDomain(EnrollmentDocument document) {
        return new EnrollmentDocumentResponse(
                document.id(),
                document.documentKey(),
                document.fileName(),
                document.storageProvider(),
                document.storageKey(),
                document.driveFileId(),
                document.driveUrl(),
                document.mimeType(),
                document.sizeBytes()
        );
    }
}
