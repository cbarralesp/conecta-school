package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.PlanningClass;
import com.example.authhexagonal.domain.model.PlanningClassStatus;
import com.example.authhexagonal.domain.model.PlanningDocumentFileType;

import java.util.List;

public interface ListPlanningClassesUseCase {

    List<PlanningClass> listClasses(
            String username,
            Integer year,
            Long courseId,
            Long subjectId,
            Integer semester,
            Integer month,
            PlanningClassStatus status,
            PlanningDocumentFileType documentType,
            String search
    );
}
