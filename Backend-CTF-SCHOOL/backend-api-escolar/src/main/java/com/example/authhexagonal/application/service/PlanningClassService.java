package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.AiSuggestionUnavailableException;
import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.PlanningClass;
import com.example.authhexagonal.domain.model.PlanningClassCatalogUnit;
import com.example.authhexagonal.domain.model.PlanningClassCatalogs;
import com.example.authhexagonal.domain.model.PlanningClassCommand;
import com.example.authhexagonal.domain.model.PlanningClassDocument;
import com.example.authhexagonal.domain.model.PlanningClassDocumentUploadCommand;
import com.example.authhexagonal.domain.model.PlanningClassDurationOption;
import com.example.authhexagonal.domain.model.PlanningClassSuggestion;
import com.example.authhexagonal.domain.model.PlanningClassSuggestionCommand;
import com.example.authhexagonal.domain.model.PlanningDocumentFileType;
import com.example.authhexagonal.domain.model.PlanningClassStatus;
import com.example.authhexagonal.domain.model.PlanningEvaluationType;
import com.example.authhexagonal.domain.model.PlanningObjectiveOption;
import com.example.authhexagonal.domain.model.PlanningOptionItem;
import com.example.authhexagonal.domain.model.StoredFileReference;
import com.example.authhexagonal.domain.port.in.AttachPlanningClassDocumentUseCase;
import com.example.authhexagonal.domain.port.in.CreatePlanningClassUseCase;
import com.example.authhexagonal.domain.port.in.DeletePlanningClassUseCase;
import com.example.authhexagonal.domain.port.in.GeneratePlanningClassSuggestionUseCase;
import com.example.authhexagonal.domain.port.in.GetPlanningClassUseCase;
import com.example.authhexagonal.domain.port.in.GetPlanningClassCatalogsUseCase;
import com.example.authhexagonal.domain.port.in.ListPlanningClassesUseCase;
import com.example.authhexagonal.domain.port.in.RemovePlanningClassDocumentUseCase;
import com.example.authhexagonal.domain.port.in.SavePlanningClassDraftUseCase;
import com.example.authhexagonal.domain.port.in.UpdatePlanningClassUseCase;
import com.example.authhexagonal.domain.port.in.UpdatePlanningClassTitleUseCase;
import com.example.authhexagonal.domain.port.out.FileStoragePort;
import com.example.authhexagonal.domain.port.out.GeneratePlanningClassSuggestionPort;
import com.example.authhexagonal.domain.port.out.PlanningCatalogRepositoryPort;
import com.example.authhexagonal.domain.port.out.PlanningClassCatalogRepositoryPort;
import com.example.authhexagonal.domain.port.out.PlanningClassDocumentRepositoryPort;
import com.example.authhexagonal.domain.port.out.PlanningClassRepositoryPort;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class PlanningClassService implements
        CreatePlanningClassUseCase,
        SavePlanningClassDraftUseCase,
        GetPlanningClassCatalogsUseCase,
        GetPlanningClassUseCase,
        ListPlanningClassesUseCase,
        DeletePlanningClassUseCase,
        AttachPlanningClassDocumentUseCase,
        RemovePlanningClassDocumentUseCase,
        UpdatePlanningClassUseCase,
        UpdatePlanningClassTitleUseCase,
        GeneratePlanningClassSuggestionUseCase {

    private static final Logger LOGGER = LoggerFactory.getLogger(PlanningClassService.class);

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "docx", "pptx");
    private static final long MAX_FILE_SIZE_BYTES = 20L * 1024L * 1024L;

    private final PlanningClassRepositoryPort planningClassRepositoryPort;
    private final PlanningClassCatalogRepositoryPort planningClassCatalogRepositoryPort;
    private final PlanningClassDocumentRepositoryPort planningClassDocumentRepositoryPort;
    private final PlanningCatalogRepositoryPort planningCatalogRepositoryPort;
    private final FileStoragePort fileStoragePort;
    private final GeneratePlanningClassSuggestionPort generatePlanningClassSuggestionPort;

    public PlanningClassService(
            PlanningClassRepositoryPort planningClassRepositoryPort,
            PlanningClassCatalogRepositoryPort planningClassCatalogRepositoryPort,
            PlanningClassDocumentRepositoryPort planningClassDocumentRepositoryPort,
            PlanningCatalogRepositoryPort planningCatalogRepositoryPort,
            FileStoragePort fileStoragePort,
            GeneratePlanningClassSuggestionPort generatePlanningClassSuggestionPort
    ) {
        this.planningClassRepositoryPort = planningClassRepositoryPort;
        this.planningClassCatalogRepositoryPort = planningClassCatalogRepositoryPort;
        this.planningClassDocumentRepositoryPort = planningClassDocumentRepositoryPort;
        this.planningCatalogRepositoryPort = planningCatalogRepositoryPort;
        this.fileStoragePort = fileStoragePort;
        this.generatePlanningClassSuggestionPort = generatePlanningClassSuggestionPort;
    }

    @Override
    public PlanningClassCatalogs getCatalogs(String username) {
        List<PlanningClassCatalogUnit> units = planningClassCatalogRepositoryPort.findUnits(username);
        List<PlanningObjectiveOption> curriculumObjectives = planningClassCatalogRepositoryPort.findObjectives(username);
        List<PlanningObjectiveOption> objectives = curriculumObjectives.isEmpty()
                ? units.stream()
                        .map(this::fallbackObjective)
                        .toList()
                : curriculumObjectives;

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
    public PlanningClass getClass(String username, Long classId) {
        return planningClassRepositoryPort.findAccessibleById(username, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Clase planificada no encontrada"));
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
    public PlanningClass updateClass(String username, Long classId, PlanningClassCommand command) {
        PlanningClass planningClass = planningClassRepositoryPort.findAccessibleById(username, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Clase planificada no encontrada"));

        PlanningClassCatalogUnit unit = planningClassCatalogRepositoryPort.findAccessibleUnitById(username, command.unitId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidad de planificacion no encontrada"));

        validateCommand(command, PlanningClassStatus.PUBLICADA);

        PlanningObjectiveOption objective = resolveObjective(unit, command.objectiveCode(), username);
        PlanningOptionItem duration = resolveDuration(command.durationCode());
        PlanningEvaluationType evaluationType = resolveEvaluationType(command.evaluationType());

        PlanningClass updatedClass = planningClassRepositoryPort.updateClass(
                planningClass.id(),
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
                PlanningClassStatus.PUBLICADA,
                true
        );

        planningClassRepositoryPort.syncCurriculumObjectives(
                updatedClass.id(),
                sanitizeObjectiveIds(command.objectiveIds())
        );
        planningClassRepositoryPort.saveObjectiveSelections(
                updatedClass.id(),
                sanitizeObjectiveSelections(command.objectiveSelections())
        );

        return reloadAccessibleClass(username, updatedClass.id());
    }

    @Override
    public void deleteClass(String username, Long classId) {
        PlanningClass planningClass = planningClassRepositoryPort.findAccessibleById(username, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Clase planificada no encontrada"));

        planningClassRepositoryPort.deleteClass(planningClass.id());
    }

    @Override
    public PlanningClassSuggestion generateSuggestion(String username, PlanningClassSuggestionCommand command) {
        if (command.subjectName() == null || command.subjectName().isBlank()) {
            throw new IllegalArgumentException("La asignatura es obligatoria para generar sugerencia");
        }
        if (command.courseName() == null || command.courseName().isBlank()) {
            throw new IllegalArgumentException("El curso es obligatorio para generar sugerencia");
        }
        if (command.objectiveCode() == null || command.objectiveCode().isBlank()) {
            throw new IllegalArgumentException("El OA es obligatorio para generar sugerencia");
        }
        if (command.objectiveDescription() == null || command.objectiveDescription().isBlank()) {
            throw new IllegalArgumentException("La descripcion del OA es obligatoria para generar sugerencia");
        }

        PlanningClassSuggestion aiSuggestion = requestAiSuggestion(command);
        if (aiSuggestion != null) {
            return aiSuggestion;
        }

        return buildLocalSuggestion(command, null);
    }

    private PlanningClassSuggestion buildLocalSuggestion(PlanningClassSuggestionCommand command, String fallbackReasonCode) {
        String normalizedAxis = normalize(command.objectiveAxis());
        boolean appreciation = normalizedAxis.contains("apreciar") || normalizedAxis.contains("responder frente al arte");

        String materials = findSubItemMatch(command.subItems(), List.of("material", "papel", "carton", "pintur", "recurso"));
        String tools = findSubItemMatch(command.subItems(), List.of("herramient", "pincel", "tijera", "tecnolog"));
        String visualElements = findSubItemMatch(command.subItems(), List.of("linea", "color", "forma", "textura", "luz", "sombra"));

        String trimmedDescription = command.objectiveDescription().trim();
        String excerpt = trimmedDescription.length() > 96
                ? trimmedDescription.substring(0, 96).trim() + "..."
                : trimmedDescription;
        String title = buildSuggestionTitle(command.objectiveAxis(), command.objectiveDescription(), command.objectiveCode());
        String objectiveSummary = "Al finalizar la clase, los estudiantes seran capaces de avanzar en %s mediante una experiencia enfocada en %s."
                .formatted(command.objectiveCode(), excerpt.toLowerCase());
        List<String> coveredIndicators = command.evaluationIndicators() == null || command.evaluationIndicators().isEmpty()
                ? List.of()
                : command.evaluationIndicators().stream()
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();

        if (appreciation) {
            return new PlanningClassSuggestion(
                    title,
                    objectiveSummary,
                    String.join("\n\n",
                            "Presentar una obra, imagen o referente visual relacionado con el OA y pedir una observacion silenciosa inicial.",
                            "Guiar una conversacion breve con preguntas detonantes: que observan, que colores o formas destacan y que sensacion les produce la propuesta visual.",
                            "Activar conocimientos previos conectando las respuestas con experiencias artisticas cercanas al curso y con el lenguaje visual que ya conocen."
                    ),
                    String.join("\n",
                            "1. Analisis guiado: profundizar en detalles de la obra o referente visual directamente vinculados con el OA seleccionado.",
                            "2. Registro personal: los estudiantes anotan o dibujan sus primeras impresiones, identificando elementos visuales y justificando sus observaciones.",
                            "3. Conversacion colaborativa: en parejas o grupos pequenos comparan sus interpretaciones y construyen una conclusion comun sobre el sentido de la obra."
                    ),
                    String.join("\n\n",
                            "Realizar un cierre tipo semaforo de apreciacion para que cada estudiante exprese si la obra le resulto cercana, desafiante o inspiradora.",
                            "Pedir a algunos voluntarios que expliquen que elemento del lenguaje visual influyo mas en su opinion.",
                            "Cerrar sintetizando como observar, describir y argumentar fortalece la apreciacion artistica."
                    ),
                    coveredIndicators,
                    "Ofrecer apoyos visuales y una guia breve de preguntas para estudiantes que requieran andamiaje en la observacion, expresion oral o escritura.",
                    buildFallbackStatusMessage(command, fallbackReasonCode),
                    buildFallbackProviderLabel(fallbackReasonCode)
            );
        }

        return new PlanningClassSuggestion(
                title,
                objectiveSummary,
                String.join("\n\n",
                        "Explicar al curso que la clase se enfocara en %s, conectando el desafio con el tema %s.".formatted(command.objectiveCode(), excerpt.toLowerCase()),
                        "Mostrar uno o dos ejemplos breves para aclarar el producto esperado y activar ideas previas antes de iniciar el trabajo practico.",
                        "Acordar criterios simples de exito para que los estudiantes sepan que deben observar, crear o comunicar durante la actividad."
                ),
                String.join("\n",
                        "1. Preparacion: organizar los materiales disponibles (%s) y recordar el uso responsable de %s."
                                .formatted(materials.isBlank() ? "papeles, cartulinas y pinturas" : materials, tools.isBlank() ? "las herramientas del taller" : tools),
                        "2. Desafio principal: los estudiantes desarrollan una produccion aplicando %s de manera intencionada."
                                .formatted(visualElements.isBlank() ? "los elementos del lenguaje visual trabajados en la unidad" : visualElements),
                        "3. Acompanamiento docente: circular por los grupos realizando preguntas, modelando decisiones tecnicas y apoyando a quienes necesiten una alternativa de acceso o mayor estructura.",
                        "4. Puesta en comun parcial: detener el trabajo para que algunos estudiantes compartan avances, dificultades y decisiones creativas antes del cierre final."
                ),
                String.join("\n\n",
                        "Organizar una galeria breve o museo vivo para observar los trabajos del curso con foco en el proceso y no solo en el producto final.",
                        "Invitar a algunos estudiantes a explicar que quisieron comunicar y que decisiones visuales tomaron para lograrlo.",
                        "Cerrar con una pregunta metacognitiva sobre que aprendieron, que les resulto desafiante y que mejorarian en una siguiente version."
                ),
                coveredIndicators,
                "Preparar materiales alternativos, modelado paso a paso y opciones de respuesta visual u oral para estudiantes que requieran apoyos PIE o diferenciacion por nivel.",
                buildFallbackStatusMessage(command, fallbackReasonCode),
                buildFallbackProviderLabel(fallbackReasonCode)
        );
    }

    private PlanningClassSuggestion requestAiSuggestion(PlanningClassSuggestionCommand command) {
        if (generatePlanningClassSuggestionPort == null) {
            return null;
        }

        try {
            return generatePlanningClassSuggestionPort.generateSuggestion(command).orElse(null);
        } catch (AiSuggestionUnavailableException exception) {
            LOGGER.warn("AI suggestion unavailable ({}), using local fallback.", exception.reasonCode());
            return buildLocalSuggestion(command, exception.reasonCode());
        } catch (Exception exception) {
            LOGGER.warn("AI suggestion unavailable, using local fallback: {}", exception.getMessage());
            return buildLocalSuggestion(command, "AI_REQUEST_FAILED");
        }
    }

    private String buildFallbackStatusMessage(PlanningClassSuggestionCommand command, String fallbackReasonCode) {
        String axis = command.objectiveAxis() == null || command.objectiveAxis().isBlank()
                ? "curricular"
                : command.objectiveAxis();

        if ("OPENAI_INSUFFICIENT_QUOTA".equals(fallbackReasonCode)) {
            return "OpenAI no disponible por cuota en este momento. Se aplico una sugerencia local segun el eje %s de %s."
                    .formatted(axis, command.objectiveCode());
        }
        if ("OPENAI_MISSING_API_KEY".equals(fallbackReasonCode)) {
            return "OpenAI no esta configurado aun. Se aplico una sugerencia local segun el eje %s de %s."
                    .formatted(axis, command.objectiveCode());
        }
        if ("OPENAI_UNAUTHORIZED".equals(fallbackReasonCode)) {
            return "OpenAI rechazo la credencial configurada. Se aplico una sugerencia local segun el eje %s de %s."
                    .formatted(axis, command.objectiveCode());
        }
        if ("GEMINI_INSUFFICIENT_QUOTA".equals(fallbackReasonCode)) {
            return "Gemini no disponible por cuota en este momento. Se aplico una sugerencia local segun el eje %s de %s."
                    .formatted(axis, command.objectiveCode());
        }
        if ("GEMINI_MISSING_API_KEY".equals(fallbackReasonCode)) {
            return "Gemini no esta configurado aun. Se aplico una sugerencia local segun el eje %s de %s."
                    .formatted(axis, command.objectiveCode());
        }
        if ("GEMINI_UNAUTHORIZED".equals(fallbackReasonCode)) {
            return "Gemini rechazo la credencial configurada. Se aplico una sugerencia local segun el eje %s de %s."
                    .formatted(axis, command.objectiveCode());
        }
        if ("DEEPSEEK_INSUFFICIENT_QUOTA".equals(fallbackReasonCode)) {
            return "DeepSeek no disponible por cuota en este momento. Se aplico una sugerencia local segun el eje %s de %s."
                    .formatted(axis, command.objectiveCode());
        }
        if ("DEEPSEEK_MISSING_API_KEY".equals(fallbackReasonCode)) {
            return "DeepSeek no esta configurado aun. Se aplico una sugerencia local segun el eje %s de %s."
                    .formatted(axis, command.objectiveCode());
        }
        if ("DEEPSEEK_UNAUTHORIZED".equals(fallbackReasonCode)) {
            return "DeepSeek rechazo la credencial configurada. Se aplico una sugerencia local segun el eje %s de %s."
                    .formatted(axis, command.objectiveCode());
        }

        return "Sugerencia aplicada en modo local segun el eje %s de %s."
                .formatted(axis, command.objectiveCode());
    }

    private String buildFallbackProviderLabel(String fallbackReasonCode) {
        if (fallbackReasonCode == null || fallbackReasonCode.isBlank()) {
            return "LOCAL";
        }
        return "LOCAL_FALLBACK:" + fallbackReasonCode;
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

        PlanningClass createdClass = planningClassRepositoryPort.createClass(
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

        planningClassRepositoryPort.syncCurriculumObjectives(
                createdClass.id(),
                sanitizeObjectiveIds(command.objectiveIds())
        );
        planningClassRepositoryPort.saveObjectiveSelections(
                createdClass.id(),
                sanitizeObjectiveSelections(command.objectiveSelections())
        );

        return reloadAccessibleClass(username, createdClass.id());
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

    private String buildSuggestionTitle(String axis, String description, String code) {
        String eje = axis == null || axis.isBlank() ? "Aprendizaje" : axis.split(":")[0].trim();
        String topicSource = description == null || description.isBlank()
                ? code
                : description.split("[.:]")[0].trim();
        String topic = topicSource.length() > 48 ? topicSource.substring(0, 48).trim() + "..." : topicSource;
        return eje + ": " + topic;
    }

    private String findSubItemMatch(List<String> subItems, List<String> keywords) {
        if (subItems == null || subItems.isEmpty()) {
            return "";
        }
        for (String item : subItems) {
            String normalized = normalize(item);
            if (keywords.stream().anyMatch(normalized::contains)) {
                return item;
            }
        }
        return "";
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("\\s+", " ")
                .trim()
                .toLowerCase(java.util.Locale.ROOT);
    }

    private PlanningObjectiveOption resolveObjective(
            PlanningClassCatalogUnit unit,
            String objectiveCode,
            String username
    ) {
        String description = normalizeNullable(unit.learningObjectives());
        if (objectiveCode == null || objectiveCode.isBlank()) {
            return fallbackObjective(unit);
        }

        return planningClassCatalogRepositoryPort.findObjectives(username).stream()
                .filter(objective -> objective.unitId().equals(unit.unitId()))
                .filter(objective -> objective.code().equalsIgnoreCase(objectiveCode.trim()))
                .findFirst()
                .orElse(new PlanningObjectiveOption(
                        null,
                        objectiveCode.trim(),
                        "OA principal - " + unit.unitNumberLabel(),
                        description,
                        unit.unitId(),
                        "",
                        List.of(),
                        List.of()
                ));
    }

    private PlanningObjectiveOption fallbackObjective(PlanningClassCatalogUnit unit) {
        return new PlanningObjectiveOption(
                "UNIT-" + unit.unitId() + "-OA-1",
                "OA principal - " + unit.unitNumberLabel(),
                normalizeNullable(unit.learningObjectives()),
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

    private List<UUID> sanitizeObjectiveIds(List<UUID> objectiveIds) {
        if (objectiveIds == null || objectiveIds.isEmpty()) {
            return List.of();
        }

        return objectiveIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private List<com.example.authhexagonal.domain.model.PlanningClassObjectiveSelection> sanitizeObjectiveSelections(
            List<com.example.authhexagonal.domain.model.PlanningClassObjectiveSelection> objectiveSelections
    ) {
        if (objectiveSelections == null || objectiveSelections.isEmpty()) {
            return List.of();
        }

        return objectiveSelections.stream()
                .filter(Objects::nonNull)
                .map(selection -> new com.example.authhexagonal.domain.model.PlanningClassObjectiveSelection(
                        selection.objectiveId(),
                        selection.objectiveCode() == null ? null : selection.objectiveCode().trim(),
                        selection.indicators() == null
                                ? List.of()
                                : selection.indicators().stream()
                                .filter(Objects::nonNull)
                                .map(String::trim)
                                .filter(value -> !value.isBlank())
                                .distinct()
                                .toList()
                ))
                .filter(selection -> selection.objectiveId() != null || (selection.objectiveCode() != null && !selection.objectiveCode().isBlank()))
                .toList();
    }

    private PlanningClass reloadAccessibleClass(String username, Long classId) {
        return planningClassRepositoryPort.findAccessibleById(username, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Clase planificada no encontrada"));
    }
}
