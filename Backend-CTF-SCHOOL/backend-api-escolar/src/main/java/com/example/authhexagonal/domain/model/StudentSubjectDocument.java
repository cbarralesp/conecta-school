package com.example.authhexagonal.domain.model;

public record StudentSubjectDocument(
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
}
