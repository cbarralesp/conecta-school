package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.PlanningSummary;
import com.example.authhexagonal.domain.model.PlanningSummaryFilter;
import com.example.authhexagonal.domain.port.in.GetPlanningSummaryUseCase;
import com.example.authhexagonal.domain.port.out.PlanningSummaryRepositoryPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Consolida la lectura del dashboard semestral de planificacion.
 */
@Service
public class PlanningSummaryService implements GetPlanningSummaryUseCase {

    private static final Logger LOGGER = LoggerFactory.getLogger(PlanningSummaryService.class);

    private final PlanningSummaryRepositoryPort planningSummaryRepositoryPort;

    public PlanningSummaryService(PlanningSummaryRepositoryPort planningSummaryRepositoryPort) {
        this.planningSummaryRepositoryPort = planningSummaryRepositoryPort;
    }

    @Override
    public PlanningSummary getSummary(String username, PlanningSummaryFilter filter) {
        if (filter.month() != null && (filter.month() < 1 || filter.month() > 12)) {
            throw new IllegalArgumentException("El mes seleccionado no es valido");
        }

        LOGGER.info("Obteniendo resumen semestral de planificacion para usuario={} filtro={}", username, filter);
        return new PlanningSummary(
                planningSummaryRepositoryPort.findMetrics(username, filter),
                planningSummaryRepositoryPort.findSubjects(username, filter),
                planningSummaryRepositoryPort.findUnits(username, filter)
        );
    }
}
