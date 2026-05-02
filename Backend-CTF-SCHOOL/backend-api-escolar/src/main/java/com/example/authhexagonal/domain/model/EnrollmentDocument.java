package com.example.authhexagonal.domain.model;

public record EnrollmentDocument(
        Long id,
        String documentKey,
        String fileName,
        String driveFileId,
        String driveUrl
) {
}
