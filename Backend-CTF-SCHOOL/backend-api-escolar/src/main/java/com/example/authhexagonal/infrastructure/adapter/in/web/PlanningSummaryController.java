package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.PlanningSummaryFilter;
import com.example.authhexagonal.domain.model.PlanningClassStatus;
import com.example.authhexagonal.domain.model.PlanningDocumentFileType;
import com.example.authhexagonal.domain.port.in.GetPlanningSummaryUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.PlanningSummaryResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Expone la vista principal del modulo de planificacion.
 */
@RestController
@RequestMapping("/api/planning/summary")
public class PlanningSummaryController {

    private static final Logger LOGGER = LoggerFactory.getLogger(PlanningSummaryController.class);

    private final GetPlanningSummaryUseCase getPlanningSummaryUseCase;

    public PlanningSummaryController(GetPlanningSummaryUseCase getPlanningSummaryUseCase) {
        this.getPlanningSummaryUseCase = getPlanningSummaryUseCase;
    }

    @GetMapping
    public PlanningSummaryResponse getSummary(
            Authentication authentication,
            @RequestParam(name = "subjectId", required = false) Long subjectId,
            @RequestParam(name = "year", required = false) Integer year,
            @RequestParam(name = "courseId", required = false) Long courseId,
            @RequestParam(name = "semester", required = false) Integer semester,
            @RequestParam(name = "month", required = false) Integer month,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "documentType", required = false) String documentType
    ) {
        LOGGER.info("Solicitando resumen semestral de planificacion usuario={} subjectId={} year={} courseId={} semester={} month={} status={} documentType={}",
                authentication.getName(), subjectId, year, courseId, semester, month, status, documentType);
        return PlanningSummaryResponse.fromDomain(
                getPlanningSummaryUseCase.getSummary(
                        authentication.getName(),
                        new PlanningSummaryFilter(subjectId, year, courseId, semester, month, parseStatus(status), parseDocumentType(documentType))
                )
        );
    }

    private PlanningDocumentFileType parseDocumentType(String documentType) {
        if (documentType == null || documentType.isBlank()) {
            return null;
        }
        return PlanningDocumentFileType.valueOf(documentType.trim().toUpperCase());
    }

    private PlanningClassStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return PlanningClassStatus.valueOf(status.trim().toUpperCase());
    }
}
