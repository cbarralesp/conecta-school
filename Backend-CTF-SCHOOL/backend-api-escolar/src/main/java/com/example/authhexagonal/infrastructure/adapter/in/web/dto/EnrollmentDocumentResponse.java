package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentDocument;

public record EnrollmentDocumentResponse(
        Long id,
        String documentKey,
        String fileName,
        String driveFileId,
        String driveUrl
) {
    public static EnrollmentDocumentResponse fromDomain(EnrollmentDocument document) {
        return new EnrollmentDocumentResponse(
                document.id(),
                document.documentKey(),
                document.fileName(),
                document.driveFileId(),
                document.driveUrl()
        );
    }
}
