package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.StudentDocumentDownload;
import com.example.authhexagonal.domain.port.in.DownloadStudentDocumentUseCase;
import com.example.authhexagonal.domain.port.in.MarkStudentDocumentReviewedUseCase;
import com.example.authhexagonal.domain.port.out.StudentDocumentRepositoryPort;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class StudentDocumentService implements MarkStudentDocumentReviewedUseCase, DownloadStudentDocumentUseCase {

    private final StudentDocumentRepositoryPort studentDocumentRepositoryPort;

    public StudentDocumentService(StudentDocumentRepositoryPort studentDocumentRepositoryPort) {
        this.studentDocumentRepositoryPort = studentDocumentRepositoryPort;
    }

    @Override
    public void markReviewed(String username, Long documentId) {
        studentDocumentRepositoryPort.markReviewed(username, documentId);
    }

    @Override
    public StudentDocumentDownload download(String username, Long documentId) {
        return studentDocumentRepositoryPort.downloadDocument(username, documentId)
                .orElseThrow(() -> new UsernameNotFoundException("Student document not found"));
    }
}
