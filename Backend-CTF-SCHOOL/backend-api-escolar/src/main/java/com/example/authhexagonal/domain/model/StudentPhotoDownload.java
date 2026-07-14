package com.example.authhexagonal.domain.model;

public record StudentPhotoDownload(
        String fileName,
        String mimeType,
        byte[] content
) {
}
