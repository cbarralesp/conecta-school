package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.StudentDocumentDownload;

import java.util.Optional;

public interface StudentDocumentRepositoryPort {

    void markReviewed(String username, Long documentId);

    Optional<StudentDocumentDownload> downloadDocument(String username, Long documentId);
}
