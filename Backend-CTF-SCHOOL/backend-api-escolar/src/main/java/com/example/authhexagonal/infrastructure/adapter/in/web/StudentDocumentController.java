package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.StudentDocumentDownload;
import com.example.authhexagonal.domain.port.in.DownloadStudentDocumentUseCase;
import com.example.authhexagonal.domain.port.in.MarkStudentDocumentReviewedUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.StudentDocumentReviewedResponse;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student/documents")
public class StudentDocumentController {

    private final MarkStudentDocumentReviewedUseCase markStudentDocumentReviewedUseCase;
    private final DownloadStudentDocumentUseCase downloadStudentDocumentUseCase;

    public StudentDocumentController(
            MarkStudentDocumentReviewedUseCase markStudentDocumentReviewedUseCase,
            DownloadStudentDocumentUseCase downloadStudentDocumentUseCase
    ) {
        this.markStudentDocumentReviewedUseCase = markStudentDocumentReviewedUseCase;
        this.downloadStudentDocumentUseCase = downloadStudentDocumentUseCase;
    }

    @PostMapping("/{documentId}/reviewed")
    public StudentDocumentReviewedResponse markReviewed(
            Authentication authentication,
            @PathVariable("documentId") Long documentId
    ) {
        markStudentDocumentReviewedUseCase.markReviewed(authentication.getName(), documentId);
        return new StudentDocumentReviewedResponse(documentId, true, "Documento marcado como revisado");
    }

    @GetMapping("/{documentId}/download")
    public ResponseEntity<ByteArrayResource> download(
            Authentication authentication,
            @PathVariable("documentId") Long documentId
    ) {
        StudentDocumentDownload download = downloadStudentDocumentUseCase.download(authentication.getName(), documentId);
        ByteArrayResource resource = new ByteArrayResource(download.content());

        return ResponseEntity.ok()
                .contentType(resolveMediaType(download.mimeType()))
                .contentLength(download.content().length)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(download.fileName())
                        .build()
                        .toString())
                .body(resource);
    }

    private MediaType resolveMediaType(String mimeType) {
        try {
            return MediaType.parseMediaType(mimeType);
        } catch (Exception exception) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
