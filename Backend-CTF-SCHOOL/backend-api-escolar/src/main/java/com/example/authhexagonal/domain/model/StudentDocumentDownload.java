package com.example.authhexagonal.domain.model;

public record StudentDocumentDownload(
        String fileName,
        String mimeType,
        byte[] content
) {
}
