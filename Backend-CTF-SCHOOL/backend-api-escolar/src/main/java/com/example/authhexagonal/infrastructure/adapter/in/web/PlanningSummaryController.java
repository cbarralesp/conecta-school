package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.PlanningSummaryFilter;
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
            @RequestParam(name = "year", required = false) Integer year
    ) {
        LOGGER.info("Solicitando resumen semestral de planificacion usuario={} subjectId={} year={}",
                authentication.getName(), subjectId, year);
        return PlanningSummaryResponse.fromDomain(
                getPlanningSummaryUseCase.getSummary(authentication.getName(), new PlanningSummaryFilter(subjectId, year))
        );
    }
}
