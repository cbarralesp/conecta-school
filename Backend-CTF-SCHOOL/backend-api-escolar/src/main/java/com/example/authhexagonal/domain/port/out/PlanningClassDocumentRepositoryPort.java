package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.PlanningClassDocument;

import java.util.List;
import java.util.Optional;

public interface PlanningClassDocumentRepositoryPort {

    PlanningClassDocument createDocument(
            Long classId,
            String originalName,
            String storedName,
            String extension,
            String mimeType,
            long sizeBytes,
            String filePath,
            boolean visibleToStudents
    );

    List<PlanningClassDocument> findByClassId(Long classId);

    Optional<PlanningClassDocument> findByIdAndClassId(Long documentId, Long classId);

    void deleteDocument(Long documentId);
}
