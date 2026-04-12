package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningClassDocument;
import com.example.authhexagonal.domain.model.PlanningClassDocumentUploadCommand;

public interface AttachPlanningClassDocumentUseCase {

    PlanningClassDocument attachDocument(String username, Long classId, PlanningClassDocumentUploadCommand command);
}
