package com.example.authhexagonal.domain.model;

public record StoredFileReference(
        String originalName,
        String storedName,
        String extension,
        String mimeType,
        long sizeBytes,
        String filePath
) {
}
