package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.PlanningOptionItem;
import com.example.authhexagonal.domain.model.PlanningUnit;
import com.example.authhexagonal.domain.model.PlanningUnitCatalogAssignment;
import com.example.authhexagonal.domain.model.PlanningUnitCatalogs;
import com.example.authhexagonal.domain.model.PlanningUnitCommand;
import com.example.authhexagonal.domain.model.PlanningUnitNumber;
import com.example.authhexagonal.domain.model.PlanningUnitStatus;
import com.example.authhexagonal.domain.model.PlanningUnitSummary;
import com.example.authhexagonal.domain.port.in.CreatePlanningUnitUseCase;
import com.example.authhexagonal.domain.port.in.DeletePlanningUnitUseCase;
import com.example.authhexagonal.domain.port.in.GetPlanningUnitUseCase;
import com.example.authhexagonal.domain.port.in.GetPlanningUnitCatalogsUseCase;
import com.example.authhexagonal.domain.port.in.GetPlanningUnitsUseCase;
import com.example.authhexagonal.domain.port.in.SavePlanningUnitDraftUseCase;
import com.example.authhexagonal.domain.port.in.UpdatePlanningUnitDetailsUseCase;
import com.example.authhexagonal.domain.port.in.UpdatePlanningUnitUseCase;
import com.example.authhexagonal.domain.port.out.PlanningCatalogRepositoryPort;
import com.example.authhexagonal.domain.port.out.PlanningUnitRepositoryPort;
import org.springframework.stereotype.Service;

import java.time.temporal.IsoFields;
import java.util.List;

@Service
public class PlanningUnitService implements
        CreatePlanningUnitUseCase,
        SavePlanningUnitDraftUseCase,
        GetPlanningUnitUseCase,
        GetPlanningUnitCatalogsUseCase,
        GetPlanningUnitsUseCase,
        UpdatePlanningUnitUseCase,
        UpdatePlanningUnitDetailsUseCase,
        DeletePlanningUnitUseCase {

    private final PlanningUnitRepositoryPort planningUnitRepositoryPort;
    private final PlanningCatalogRepositoryPort planningCatalogRepositoryPort;

    public PlanningUnitService(
            PlanningUnitRepositoryPort planningUnitRepositoryPort,
            PlanningCatalogRepositoryPort planningCatalogRepositoryPort
    ) {
        this.planningUnitRepositoryPort = planningUnitRepositoryPort;
        this.planningCatalogRepositoryPort = planningCatalogRepositoryPort;
    }

    @Override
    public PlanningUnitCatalogs getCatalogs(String username) {
        return new PlanningUnitCatalogs(
                planningCatalogRepositoryPort.findAvailableAssignments(username),
                PlanningUnitNumber.asOptions(),
                buildWeekOptions()
        );
    }

    @Override
    public PlanningUnit createUnit(String username, PlanningUnitCommand command) {
        return save(username, command, PlanningUnitStatus.CREADA);
    }

    @Override
    public PlanningUnit saveDraft(String username, PlanningUnitCommand command) {
        return save(username, command, PlanningUnitStatus.BORRADOR);
    }

    @Override
    public List<PlanningUnitSummary> findUnits(String username) {
        return planningUnitRepositoryPort.findUnitsByUsername(username);
    }

    @Override
    public PlanningUnit getUnit(String username, Long unitId) {
        return planningUnitRepositoryPort.findAccessibleById(username, unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unidad de planificacion no encontrada"));
    }

    @Override
    public PlanningUnit updateUnit(String username, Long unitId, String unitNumber, String name) {
        PlanningUnit planningUnit = planningUnitRepositoryPort.findAccessibleById(username, unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unidad de planificacion no encontrada"));

        if (unitNumber == null || unitNumber.isBlank()) {
            throw new IllegalArgumentException("El numero de unidad es obligatorio");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("El nombre de la unidad es obligatorio");
        }

        return planningUnitRepositoryPort.updateUnit(
                planningUnit.id(),
                unitNumber.trim(),
                name.trim()
        );
    }

    @Override
    public PlanningUnit updateUnitDetails(String username, Long unitId, PlanningUnitCommand command) {
        PlanningUnit planningUnit = planningUnitRepositoryPort.findAccessibleById(username, unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unidad de planificacion no encontrada"));

        validateCommand(command, planningUnit.status());

        int startWeek = command.startWeek() != null
                ? command.startWeek()
                : command.startDate().get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);

        return planningUnitRepositoryPort.updateUnitDetails(
                planningUnit.id(),
                command.unitNumber().trim(),
                command.name().trim(),
                startWeek,
                command.startDate(),
                command.endDate(),
                command.estimatedWeeks() == null ? 1 : command.estimatedWeeks(),
                command.plannedClasses() == null ? 0 : command.plannedClasses(),
                normalizeNullable(command.generalDescription()),
                normalizeNullable(command.learningObjectives()),
                normalizeNullable(command.achievementIndicators())
        );
    }

    @Override
    public void deleteUnit(String username, Long unitId) {
        planningUnitRepositoryPort.findAccessibleById(username, unitId)
                .orElseThrow(() -> new ResourceNotFoundException("Unidad de planificacion no encontrada"));

        if (planningUnitRepositoryPort.hasClasses(unitId)) {
            throw new IllegalArgumentException("La unidad tiene clases asociadas y no puede eliminarse");
        }

        planningUnitRepositoryPort.deleteUnit(unitId);
    }

    private PlanningUnit save(String username, PlanningUnitCommand command, PlanningUnitStatus status) {
        List<PlanningUnitCatalogAssignment> availableAssignments =
                planningCatalogRepositoryPort.findAvailableAssignments(username);

        PlanningUnitCatalogAssignment assignment = availableAssignments.stream()
                .filter(item -> item.subjectId().equals(command.subjectId()))
                .filter(item -> item.courseId().equals(command.courseId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("No existe una carga docente activa para la asignatura y curso seleccionados"));

        Long createdByUserId = planningCatalogRepositoryPort.findUserIdByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario autenticado no encontrado"));

        validateCommand(command, status);

        int startWeek = command.startWeek() != null
                ? command.startWeek()
                : command.startDate().get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);

        return planningUnitRepositoryPort.createUnit(
                assignment.loadId(),
                command.unitNumber(),
                command.name().trim(),
                startWeek,
                command.startDate(),
                command.endDate(),
                command.estimatedWeeks() == null ? 1 : command.estimatedWeeks(),
                command.plannedClasses() == null ? 0 : command.plannedClasses(),
                normalizeNullable(command.generalDescription()),
                normalizeNullable(command.learningObjectives()),
                normalizeNullable(command.achievementIndicators()),
                status,
                createdByUserId
        );
    }

    private void validateCommand(PlanningUnitCommand command, PlanningUnitStatus status) {
        if (command.subjectId() == null) {
            throw new IllegalArgumentException("La asignatura es obligatoria");
        }
        if (command.courseId() == null) {
            throw new IllegalArgumentException("El curso es obligatorio");
        }
        if (command.unitNumber() == null || command.unitNumber().isBlank()) {
            throw new IllegalArgumentException("El numero de unidad es obligatorio");
        }
        if (command.name() == null || command.name().isBlank()) {
            throw new IllegalArgumentException("El nombre de la unidad es obligatorio");
        }
        if (command.startDate() == null) {
            throw new IllegalArgumentException("La fecha de inicio es obligatoria");
        }
        if (command.endDate() == null) {
            throw new IllegalArgumentException("La fecha de termino es obligatoria");
        }
        if (command.endDate().isBefore(command.startDate())) {
            throw new IllegalArgumentException("La fecha de termino no puede ser anterior a la fecha de inicio");
        }
        if (command.estimatedWeeks() != null && command.estimatedWeeks() < 1) {
            throw new IllegalArgumentException("Las semanas estimadas deben ser mayores o iguales a 1");
        }
        if (command.plannedClasses() != null && command.plannedClasses() < 0) {
            throw new IllegalArgumentException("Las clases planificadas no pueden ser negativas");
        }

        if (status != PlanningUnitStatus.BORRADOR) {
            if (command.learningObjectives() == null || command.learningObjectives().isBlank()) {
                throw new IllegalArgumentException("Los objetivos de aprendizaje son obligatorios");
            }
            if (command.achievementIndicators() == null || command.achievementIndicators().isBlank()) {
                throw new IllegalArgumentException("Los indicadores de logro son obligatorios");
            }
        }
    }

    private List<PlanningOptionItem> buildWeekOptions() {
        return java.util.stream.IntStream.rangeClosed(1, 52)
                .mapToObj(week -> new PlanningOptionItem(String.valueOf(week), "Semana " + week))
                .toList();
    }

    private String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
