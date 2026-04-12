package com.example.authhexagonal.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record StudentSubjectDocumentRow(
        Long unitId,
        String unitNumber,
        String unitName,
        int durationWeeks,
        Long classId,
        String classTitle,
        LocalDate classDate,
        Long documentId,
        String fileName,
        String fileType,
        String mimeType,
        String extension,
        long fileSizeBytes,
        LocalDateTime publishedAt,
        boolean reviewed
) {
}
