package com.example.authhexagonal.domain.port.in;

public interface MarkStudentDocumentReviewedUseCase {

    void markReviewed(String username, Long documentId);
}
