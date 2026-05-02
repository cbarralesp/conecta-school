package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.PlanningDocumentDownload;
import com.example.authhexagonal.domain.model.PlanningDocumentFileType;
import com.example.authhexagonal.domain.model.PlanningDocumentFilter;
import com.example.authhexagonal.domain.port.in.DeletePlanningDocumentUseCase;
import com.example.authhexagonal.domain.port.in.DownloadPlanningDocumentUseCase;
import com.example.authhexagonal.domain.port.in.ListPlanningDocumentsUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningDocumentDeleteResponse;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningDocumentResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Expone el banco centralizado de documentos de planificacion.
 */
@RestController
@RequestMapping("/api/planning/documents")
public class PlanningDocumentsController {

    private static final Logger LOGGER = LoggerFactory.getLogger(PlanningDocumentsController.class);

    private final ListPlanningDocumentsUseCase listPlanningDocumentsUseCase;
    private final DownloadPlanningDocumentUseCase downloadPlanningDocumentUseCase;
    private final DeletePlanningDocumentUseCase deletePlanningDocumentUseCase;

    public PlanningDocumentsController(
            ListPlanningDocumentsUseCase listPlanningDocumentsUseCase,
            DownloadPlanningDocumentUseCase downloadPlanningDocumentUseCase,
            DeletePlanningDocumentUseCase deletePlanningDocumentUseCase
    ) {
        this.listPlanningDocumentsUseCase = listPlanningDocumentsUseCase;
        this.downloadPlanningDocumentUseCase = downloadPlanningDocumentUseCase;
        this.deletePlanningDocumentUseCase = deletePlanningDocumentUseCase;
    }

    @GetMapping
    public List<PlanningDocumentResponse> list(
            Authentication authentication,
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "unitId", required = false) Long unitId,
            @RequestParam(name = "classId", required = false) Long classId,
            @RequestParam(name = "subjectId", required = false) Long subjectId,
            @RequestParam(name = "visibleToStudents", required = false) Boolean visibleToStudents
    ) {
        LOGGER.info("Solicitando banco de documentos de planificacion usuario={}", authentication.getName());
        PlanningDocumentFilter filter = new PlanningDocumentFilter(
                parseType(type),
                unitId,
                classId,
                subjectId,
                visibleToStudents
        );
        return listPlanningDocumentsUseCase.listDocuments(authentication.getName(), filter).stream()
                .map(PlanningDocumentResponse::fromDomain)
                .toList();
    }

    @GetMapping("/{documentId}/download")
    public ResponseEntity<ByteArrayResource> download(
            Authentication authentication,
            @PathVariable("documentId") Long documentId
    ) {
        PlanningDocumentDownload download = downloadPlanningDocumentUseCase.downloadDocument(
                authentication.getName(),
                documentId
        );
        ByteArrayResource resource = new ByteArrayResource(download.content());

        return ResponseEntity.ok()
                .contentType(resolveMediaType(download.document().mimeType()))
                .contentLength(download.content().length)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(download.document().originalName())
                        .build()
                        .toString())
                .body(resource);
    }

    @DeleteMapping("/{documentId}")
    public PlanningDocumentDeleteResponse delete(
            Authentication authentication,
            @PathVariable("documentId") Long documentId
    ) {
        deletePlanningDocumentUseCase.deleteDocument(authentication.getName(), documentId);
        return new PlanningDocumentDeleteResponse(documentId, "ELIMINADO", "Documento eliminado correctamente");
    }

    private PlanningDocumentFileType parseType(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        return PlanningDocumentFileType.valueOf(type.trim().toUpperCase());
    }

    private MediaType resolveMediaType(String mimeType) {
        try {
            return MediaType.parseMediaType(mimeType);
        } catch (Exception exception) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
