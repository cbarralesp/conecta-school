package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.PlanningDocument;
import com.example.authhexagonal.domain.model.PlanningDocumentDownload;
import com.example.authhexagonal.domain.model.PlanningDocumentFilter;
import com.example.authhexagonal.domain.port.in.DeletePlanningDocumentUseCase;
import com.example.authhexagonal.domain.port.in.DownloadPlanningDocumentUseCase;
import com.example.authhexagonal.domain.port.in.ListPlanningDocumentsUseCase;
import com.example.authhexagonal.domain.port.out.FileStoragePort;
import com.example.authhexagonal.domain.port.out.PlanningDocumentRepositoryPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Orquesta el banco de documentos de planificacion y su acceso desacoplado del storage.
 */
@Service
public class PlanningDocumentService implements
        ListPlanningDocumentsUseCase,
        DownloadPlanningDocumentUseCase,
        DeletePlanningDocumentUseCase {

    private static final Logger LOGGER = LoggerFactory.getLogger(PlanningDocumentService.class);

    private final PlanningDocumentRepositoryPort planningDocumentRepositoryPort;
    private final FileStoragePort fileStoragePort;

    public PlanningDocumentService(
            PlanningDocumentRepositoryPort planningDocumentRepositoryPort,
            FileStoragePort fileStoragePort
    ) {
        this.planningDocumentRepositoryPort = planningDocumentRepositoryPort;
        this.fileStoragePort = fileStoragePort;
    }

    @Override
    public List<PlanningDocument> listDocuments(String username, PlanningDocumentFilter filter) {
        LOGGER.info("Listando documentos de planificacion para usuario={} filtro={}", username, filter);
        return planningDocumentRepositoryPort.findDocuments(username, filter);
    }

    @Override
    public PlanningDocumentDownload downloadDocument(String username, Long documentId) {
        PlanningDocument document = planningDocumentRepositoryPort.findAccessibleById(username, documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Documento de planificacion no encontrado"));
        LOGGER.info("Descargando documento de planificacion id={} usuario={}", documentId, username);
        return new PlanningDocumentDownload(document, fileStoragePort.read(document.filePath()));
    }

    @Override
    public void deleteDocument(String username, Long documentId) {
        PlanningDocument document = planningDocumentRepositoryPort.findAccessibleById(username, documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Documento de planificacion no encontrado"));
        LOGGER.info("Eliminando documento de planificacion id={} usuario={}", documentId, username);
        planningDocumentRepositoryPort.markDeleted(documentId);
        fileStoragePort.delete(document.filePath());
    }
}
