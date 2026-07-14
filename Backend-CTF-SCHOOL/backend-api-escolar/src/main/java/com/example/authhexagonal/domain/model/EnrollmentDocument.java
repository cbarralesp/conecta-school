package com.example.authhexagonal.domain.model;

public record EnrollmentDocument(
        Long id,
        String documentKey,
        String fileName,
        String storageProvider,
        String storageKey,
        String driveFileId,
        String driveUrl,
        String mimeType,
        Long sizeBytes,
        String filePath
) {
}
