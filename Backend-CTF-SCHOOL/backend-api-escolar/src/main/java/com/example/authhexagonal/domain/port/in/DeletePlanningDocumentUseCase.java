package com.example.authhexagonal.domain.port.in;

public interface DeletePlanningDocumentUseCase {

    void deleteDocument(String username, Long documentId);
}
