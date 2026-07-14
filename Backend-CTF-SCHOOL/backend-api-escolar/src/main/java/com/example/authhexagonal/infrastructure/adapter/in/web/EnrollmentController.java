package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.ManageEnrollmentsUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentDetailResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentDocumentResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentAccessPreviewRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentAccessPreviewResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentOverviewResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentRenewalRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.EnrollmentRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/matriculas")
public class EnrollmentController {

    private final ManageEnrollmentsUseCase manageEnrollmentsUseCase;

    public EnrollmentController(ManageEnrollmentsUseCase manageEnrollmentsUseCase) {
        this.manageEnrollmentsUseCase = manageEnrollmentsUseCase;
    }

    @GetMapping
    public EnrollmentOverviewResponse findOverview(
            @RequestParam(name = "schoolYear", required = false) Integer schoolYear,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "courseId", required = false) Long courseId,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size
    ) {
        return EnrollmentOverviewResponse.fromDomain(
                manageEnrollmentsUseCase.findOverview(schoolYear, search, courseId, status, page, size)
        );
    }

    @GetMapping("/{enrollmentId}")
    public EnrollmentDetailResponse findById(@PathVariable("enrollmentId") Long enrollmentId) {
        return EnrollmentDetailResponse.fromDomain(manageEnrollmentsUseCase.findById(enrollmentId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EnrollmentDetailResponse create(@Valid @RequestBody EnrollmentRequest request) {
        return EnrollmentDetailResponse.fromDomain(manageEnrollmentsUseCase.create(request));
    }

    @PutMapping("/{enrollmentId}")
    public EnrollmentDetailResponse update(
            @PathVariable("enrollmentId") Long enrollmentId,
            @Valid @RequestBody EnrollmentRequest request
    ) {
        return EnrollmentDetailResponse.fromDomain(manageEnrollmentsUseCase.update(enrollmentId, request));
    }

    @PostMapping("/{enrollmentId}/renovar")
    public EnrollmentDetailResponse renew(
            @PathVariable("enrollmentId") Long enrollmentId,
            @Valid @RequestBody EnrollmentRenewalRequest request
    ) {
        return EnrollmentDetailResponse.fromDomain(manageEnrollmentsUseCase.renew(enrollmentId, request));
    }

    @PostMapping("/access-preview")
    public EnrollmentAccessPreviewResponse previewAccess(@RequestBody EnrollmentAccessPreviewRequest request) {
        return manageEnrollmentsUseCase.previewAccess(request);
    }

    @PostMapping(path = "/{enrollmentId}/documentos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EnrollmentDocumentResponse uploadDocument(
            @PathVariable("enrollmentId") Long enrollmentId,
            @RequestParam("documentKey") String documentKey,
            @RequestParam("file") MultipartFile file
    ) throws java.io.IOException {
        return EnrollmentDocumentResponse.fromDomain(
                manageEnrollmentsUseCase.uploadDocument(
                        enrollmentId,
                        documentKey,
                        file.getOriginalFilename(),
                        file.getContentType(),
                        file.getBytes()
                )
        );
    }

    @GetMapping("/{enrollmentId}/documentos/{documentId}/download")
    public ResponseEntity<ByteArrayResource> downloadDocument(
            @PathVariable("enrollmentId") Long enrollmentId,
            @PathVariable("documentId") Long documentId
    ) {
        var download = manageEnrollmentsUseCase.downloadDocument(enrollmentId, documentId);
        ByteArrayResource resource = new ByteArrayResource(download.content());

        return ResponseEntity.ok()
                .contentType(resolveMediaType(download.document().mimeType()))
                .contentLength(download.content().length)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(resolveDownloadFileName(download.document().fileName()), StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .body(resource);
    }

    @PostMapping(path = "/{enrollmentId}/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EnrollmentDetailResponse uploadStudentPhoto(
            @PathVariable("enrollmentId") Long enrollmentId,
            @RequestParam("file") MultipartFile file
    ) throws java.io.IOException {
        return EnrollmentDetailResponse.fromDomain(
                manageEnrollmentsUseCase.uploadStudentPhoto(
                        enrollmentId,
                        file.getOriginalFilename(),
                        file.getContentType(),
                        file.getBytes()
                )
        );
    }

    @GetMapping("/{enrollmentId}/foto")
    public ResponseEntity<ByteArrayResource> downloadStudentPhoto(
            @PathVariable("enrollmentId") Long enrollmentId
    ) {
        var download = manageEnrollmentsUseCase.downloadStudentPhoto(enrollmentId);
        ByteArrayResource resource = new ByteArrayResource(download.content());

        return ResponseEntity.ok()
                .contentType(resolveMediaType(download.mimeType()))
                .contentLength(download.content().length)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(resolveDownloadFileName(download.fileName()), StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .body(resource);
    }

    @DeleteMapping("/{enrollmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("enrollmentId") Long enrollmentId) {
        manageEnrollmentsUseCase.delete(enrollmentId);
    }

    @PostMapping("/{enrollmentId}/reactivar")
    public EnrollmentDetailResponse reactivate(@PathVariable("enrollmentId") Long enrollmentId) {
        return EnrollmentDetailResponse.fromDomain(manageEnrollmentsUseCase.reactivate(enrollmentId));
    }

    private MediaType resolveMediaType(String mimeType) {
        try {
            return MediaType.parseMediaType(mimeType);
        } catch (Exception exception) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    private String resolveDownloadFileName(String fileName) {
        return fileName == null || fileName.isBlank() ? "documento" : fileName;
    }
}
