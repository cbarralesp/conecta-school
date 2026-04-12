package com.example.authhexagonal.domain.port.in;

public interface RemovePlanningClassDocumentUseCase {

    void removeDocument(String username, Long classId, Long documentId);
}
