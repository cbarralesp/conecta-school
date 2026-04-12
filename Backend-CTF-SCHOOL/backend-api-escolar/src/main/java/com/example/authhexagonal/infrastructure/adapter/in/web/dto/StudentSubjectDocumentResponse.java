package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentSubjectDocument;

public record StudentSubjectDocumentResponse(
        Long documentId,
        String fileName,
        String fileType,
        Long fileSizeBytes,
        String fileSizeLabel,
        String metaLabel,
        String publishedAt,
        boolean isNew,
        boolean reviewed,
        String downloadUrl,
        String previewUrl
) {

    public static StudentSubjectDocumentResponse fromDomain(StudentSubjectDocument document) {
        return new StudentSubjectDocumentResponse(
                document.documentId(),
                document.fileName(),
                document.fileType(),
                document.fileSizeBytes(),
                document.fileSizeLabel(),
                document.metaLabel(),
                document.publishedAt(),
                document.isNew(),
                document.reviewed(),
                document.downloadUrl(),
                document.previewUrl()
        );
    }
}
