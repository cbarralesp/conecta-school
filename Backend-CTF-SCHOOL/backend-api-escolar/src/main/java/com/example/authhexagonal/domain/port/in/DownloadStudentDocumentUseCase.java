package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.StudentDocumentDownload;

public interface DownloadStudentDocumentUseCase {

    StudentDocumentDownload download(String username, Long documentId);
}
