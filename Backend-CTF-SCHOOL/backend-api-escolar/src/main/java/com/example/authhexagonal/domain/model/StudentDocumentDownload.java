package com.example.authhexagonal.domain.model;

public record StudentDocumentDownload(
        String fileName,
        String downloadFileName,
        String mimeType,
        byte[] content
) {
}
