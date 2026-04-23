package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.PlanningClass;
import com.example.authhexagonal.domain.model.PlanningClassCatalogUnit;
import com.example.authhexagonal.domain.model.PlanningClassCatalogs;
import com.example.authhexagonal.domain.model.PlanningClassCommand;
import com.example.authhexagonal.domain.model.PlanningClassDocument;
import com.example.authhexagonal.domain.model.PlanningClassDocumentUploadCommand;
import com.example.authhexagonal.domain.model.PlanningClassDurationOption;
import com.example.authhexagonal.domain.model.PlanningDocumentFileType;
import com.example.authhexagonal.domain.model.PlanningClassStatus;
import com.example.authhexagonal.domain.model.PlanningEvaluationType;
import com.example.authhexagonal.domain.model.PlanningObjectiveOption;
import com.example.authhexagonal.domain.model.PlanningOptionItem;
import com.example.authhexagonal.domain.model.StoredFileReference;
import com.example.authhexagonal.domain.port.in.AttachPlanningClassDocumentUseCase;
import com.example.authhexagonal.domain.port.in.CreatePlanningClassUseCase;
import com.example.authhexagonal.domain.port.in.DeletePlanningClassUseCase;
import com.example.authhexagonal.domain.port.in.GetPlanningClassCatalogsUseCase;
import com.example.authhexagonal.domain.port.in.ListPlanningClassesUseCase;
import com.example.authhexagonal.domain.port.in.RemovePlanningClassDocumentUseCase;
import com.example.authhexagonal.domain.port.in.SavePlanningClassDraftUseCase;
import com.example.authhexagonal.domain.port.in.UpdatePlanningClassTitleUseCase;
import com.example.authhexagonal.domain.port.out.FileStoragePort;
import com.example.authhexagonal.domain.port.out.PlanningCatalogRepositoryPort;
import com.example.authhexagonal.domain.port.out.PlanningClassCatalogRepositoryPort;
import com.example.authhexagonal.domain.port.out.PlanningClassDocumentRepositoryPort;
import com.example.authhexagonal.domain.port.out.PlanningClassRepositoryPort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class PlanningClassService implements
        CreatePlanningClassUseCase,
        SavePlanningClassDraftUseCase,
        GetPlanningClassCatalogsUseCase,
        ListPlanningClassesUseCase,
        DeletePlanningClassUseCase,
        AttachPlanningClassDocumentUseCase,
        RemovePlanningClassDocumentUseCase,
        UpdatePlanningClassTitleUseCase {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "docx", "pptx");
    private static final long MAX_FILE_SIZE_BYTES = 20L * 1024L * 1024L;

    private final PlanningClassRepositoryPort planningClassRepositoryPort;
    private final PlanningClassCatalogRepositoryPort planningClassCatalogRepositoryPort;
    private final PlanningClassDocumentRepositoryPort planningClassDocumentRepositoryPort;
    private final PlanningCatalogRepositoryPort planningCatalogRepositoryPort;
    private final FileStoragePort fileStoragePort;

    public PlanningClassService(
            PlanningClassRepositoryPort planningClassRepositoryPort,
            PlanningClassCatalogRepositoryPort planningClassCatalogRepositoryPort,
            PlanningClassDocumentRepositoryPort planningClassDocumentRepositoryPort,
            PlanningCatalogRepositoryPort planningCatalogRepositoryPort,
            FileStoragePort fileStoragePort
    ) {
        this.planningClassRepositoryPort = planningClassRepositoryPort;
        this.planningClassCatalogRepositoryPort = planningClassCatalogRepositoryPort;
        this.planningClassDocumentRepositoryPort = planningClassDocumentRepositoryPort;
        this.planningCatalogRepositoryPort = planningCatalogRepositoryPort;
        this.fileStoragePort = fileStoragePort;
    }

    @Override
    public PlanningClassCatalogs getCatalogs(String username) {
        List<PlanningClassCatalogUnit> units = planningClassCatalogRepositoryPort.findUnits(username);
        List<PlanningObjectiveOption> objectives = units.stream()
                .map(unit -> new PlanningObjectiveOption(
                        "UNIT-" + unit.unitId() + "-OA-1",
                        "OA principal - " + unit.unitNumberLabel(),
                        normalizeNullable(unit.learningObjectives()),
                        unit.unitId()
                ))
                .toList();

        return new PlanningClassCatalogs(
                units,
                objectives,
                PlanningEvaluationType.asOptions(),
                PlanningClassDurationOption.defaults()
        );
    }

    @Override
    public List<PlanningClass> listClasses(
            String username,
            Long courseId,
            Long subjectId,
            Integer semester,
            Integer month,
            PlanningClassStatus status,
            PlanningDocumentFileType documentType,
            String search
    ) {
        validateMonth(month);
        return planningClassRepositoryPort.findClasses(username, courseId, subjectId, semester, month, status, documentType, search);
    }

    @Override
    public PlanningClass createClass(String username, PlanningClassCommand command) {
        return save(username, command, PlanningClassStatus.PUBLICADA, true);
    }

    @Override
    public PlanningClass saveDraft(String username, PlanningClassCommand command) {
        return save(username, command, PlanningClassStatus.BORRADOR, false);
    }

    @Override
    public PlanningClassDocument attachDocument(
            String username,
            Long classId,
            PlanningClassDocumentUploadCommand command
    ) {
        PlanningClass planningClass = planningClassRepositoryPort.findAccessibleById(username, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Clase planificada no encontrada"));

        validateDocument(command);

        StoredFileReference storedFile = fileStoragePort.storePlanningClassDocument(
                command.originalName(),
                command.mimeType(),
                command.content()
        );

        return planningClassDocumentRepositoryPort.createDocument(
                planningClass.id(),
                storedFile.originalName(),
                storedFile.storedName(),
                storedFile.extension(),
                storedFile.mimeType(),
                storedFile.sizeBytes(),
                storedFile.filePath(),
                command.visibleToStudents()
        );
    }

    @Override
    public void removeDocument(String username, Long classId, Long documentId) {
        planningClassRepositoryPort.findAccessibleById(username, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Clase planificada no encontrada"));

        PlanningClassDocument document = planningClassDocumentRepositoryPort.findByIdAndClassId(documentId, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Documento no encontrado"));

        planningClassDocumentRepositoryPort.deleteDocument(documentId);
        fileStoragePort.delete(document.filePath());
    }

    @Override
    public PlanningClass updateTitle(String username, Long classId, String title) {
        PlanningClass planningClass = planningClassRepositoryPort.findAccessibleById(username, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Clase planificada no encontrada"));

        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("El titulo de la clase es obligatorio");
        }

        return planningClassRepositoryPort.updateTitle(planningClass.id(), title.trim());
    }

    @Override
    public void deleteClass(String username, Long classId) {
        PlanningClass planningClass = planningClassRepositoryPort.findAccessibleById(username, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Clase planificada no encontrada"));

        planningClassRepositoryPort.deleteClass(planningClass.id());
    }

    private PlanningClass save(
            String username,
            PlanningClassCommand command,
            PlanningClassStatus status,
            boolean publishedToStudents
    ) {
        PlanningClassCatalogUnit unit = planningClassCatalogRepositoryPort.findAccessibleUnitById(username, command.unitId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidad de planificacion no encontrada"));

        Long createdByUserId = planningCatalogRepositoryPort.findUserIdByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario autenticado no encontrado"));

        validateCommand(command, status);

        PlanningObjectiveOption objective = resolveObjective(unit, command.objectiveCode(), username);
        PlanningOptionItem duration = resolveDuration(command.durationCode());
        PlanningEvaluationType evaluationType = resolveEvaluationType(command.evaluationType());

        return planningClassRepositoryPort.createClass(
                unit.unitId(),
                command.title().trim(),
                command.plannedDate(),
                duration.code(),
                duration.label(),
                objective.code(),
                objective.label(),
                objective.description(),
                evaluationType.name(),
                normalizeNullable(command.startActivity()),
                normalizeNullable(command.developmentActivity()),
                normalizeNullable(command.closingActivity()),
                status,
                publishedToStudents,
                createdByUserId
        );
    }

    private void validateCommand(PlanningClassCommand command, PlanningClassStatus status) {
        if (command.unitId() == null) {
            throw new IllegalArgumentException("La unidad es obligatoria");
        }
        if (command.durationCode() == null || command.durationCode().isBlank()) {
            throw new IllegalArgumentException("La duracion es obligatoria");
        }
        if (command.plannedDate() == null) {
            throw new IllegalArgumentException("La fecha planificada es obligatoria");
        }
        if (command.title() == null || command.title().isBlank()) {
            throw new IllegalArgumentException("El titulo de la clase es obligatorio");
        }

        if (status == PlanningClassStatus.PUBLICADA) {
            if (command.objectiveCode() == null || command.objectiveCode().isBlank()) {
                throw new IllegalArgumentException("El OA es obligatorio");
            }
            if (command.evaluationType() == null || command.evaluationType().isBlank()) {
                throw new IllegalArgumentException("El tipo de evaluacion es obligatorio");
            }
            if (command.startActivity() == null || command.startActivity().isBlank()) {
                throw new IllegalArgumentException("El inicio de la clase es obligatorio");
            }
            if (command.developmentActivity() == null || command.developmentActivity().isBlank()) {
                throw new IllegalArgumentException("El desarrollo de la clase es obligatorio");
            }
            if (command.closingActivity() == null || command.closingActivity().isBlank()) {
                throw new IllegalArgumentException("El cierre de la clase es obligatorio");
            }
        }
    }

    private void validateMonth(Integer month) {
        if (month != null && (month < 1 || month > 12)) {
            throw new IllegalArgumentException("El mes seleccionado no es valido");
        }
    }

    private PlanningObjectiveOption resolveObjective(
            PlanningClassCatalogUnit unit,
            String objectiveCode,
            String username
    ) {
        String description = normalizeNullable(unit.learningObjectives());
        if (objectiveCode == null || objectiveCode.isBlank()) {
            return new PlanningObjectiveOption(
                    "UNIT-" + unit.unitId() + "-OA-1",
                    "OA principal - " + unit.unitNumberLabel(),
                    description,
                    unit.unitId()
            );
        }

        return new PlanningObjectiveOption(
                objectiveCode,
                "OA principal - " + unit.unitNumberLabel(),
                description,
                unit.unitId()
        );
    }

    private PlanningOptionItem resolveDuration(String durationCode) {
        return PlanningClassDurationOption.defaults().stream()
                .filter(item -> item.code().equalsIgnoreCase(durationCode))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("La duracion seleccionada no es valida"));
    }

    private PlanningEvaluationType resolveEvaluationType(String evaluationType) {
        try {
            return PlanningEvaluationType.valueOf(evaluationType.trim().toUpperCase());
        } catch (Exception exception) {
            throw new IllegalArgumentException("El tipo de evaluacion no es valido");
        }
    }

    private void validateDocument(PlanningClassDocumentUploadCommand command) {
        if (command.originalName() == null || command.originalName().isBlank()) {
            throw new IllegalArgumentException("El archivo no tiene nombre valido");
        }
        if (command.sizeBytes() <= 0) {
            throw new IllegalArgumentException("El archivo adjunto esta vacio");
        }
        if (command.sizeBytes() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("El archivo supera el limite de 20 MB");
        }

        String extension = extractExtension(command.originalName());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Solo se permiten archivos PDF, DOCX o PPTX");
        }
    }

    private String extractExtension(String originalName) {
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == originalName.length() - 1) {
            return "";
        }
        return originalName.substring(dotIndex + 1).toLowerCase();
    }

    private String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
