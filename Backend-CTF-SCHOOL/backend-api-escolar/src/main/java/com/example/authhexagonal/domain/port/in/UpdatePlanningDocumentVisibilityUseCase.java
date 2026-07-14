package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningDocument;

public interface UpdatePlanningDocumentVisibilityUseCase {

    PlanningDocument updateVisibility(String username, Long documentId, boolean visibleToStudents);
}
