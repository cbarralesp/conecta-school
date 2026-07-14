package com.example.authhexagonal.domain.model;

public record EnrollmentDocumentDownload(
        EnrollmentDocument document,
        byte[] content
) {
}
