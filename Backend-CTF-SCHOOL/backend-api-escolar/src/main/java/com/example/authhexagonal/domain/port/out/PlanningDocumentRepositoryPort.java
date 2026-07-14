package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.PlanningDocument;
import com.example.authhexagonal.domain.model.PlanningDocumentFilter;

import java.util.List;
import java.util.Optional;

public interface PlanningDocumentRepositoryPort {

    List<PlanningDocument> findDocuments(String username, PlanningDocumentFilter filter);

    Optional<PlanningDocument> findAccessibleById(String username, Long documentId);

    PlanningDocument updateVisibility(Long documentId, boolean visibleToStudents);

    void markDeleted(Long documentId);
}
