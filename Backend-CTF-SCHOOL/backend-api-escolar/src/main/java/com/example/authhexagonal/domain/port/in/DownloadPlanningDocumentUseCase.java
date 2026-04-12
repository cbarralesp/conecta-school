package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningDocumentDownload;

public interface DownloadPlanningDocumentUseCase {

    PlanningDocumentDownload downloadDocument(String username, Long documentId);
}
