package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningDocument;
import com.example.authhexagonal.domain.model.PlanningDocumentFilter;

import java.util.List;

public interface ListPlanningDocumentsUseCase {

    List<PlanningDocument> listDocuments(String username, PlanningDocumentFilter filter);
}
