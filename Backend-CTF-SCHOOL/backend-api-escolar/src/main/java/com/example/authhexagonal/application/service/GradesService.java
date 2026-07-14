package com.example.authhexagonal.application.service;

import com.example.authhexagonal.application.support.AcademicSemesterResolver;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.GradeBookStudentRow;
import com.example.authhexagonal.domain.model.GradeBookSummary;
import com.example.authhexagonal.domain.model.GradeBookView;
import com.example.authhexagonal.domain.model.GradeCatalog;
import com.example.authhexagonal.domain.model.GradeCourseOption;
import com.example.authhexagonal.domain.model.GradeEvaluationCommand;
import com.example.authhexagonal.domain.model.GradeEvaluationHeader;
import com.example.authhexagonal.domain.model.GradePeriodOption;
import com.example.authhexagonal.domain.model.GradeReportView;
import com.example.authhexagonal.domain.model.GradeSaveCommand;
import com.example.authhexagonal.domain.model.GradeScoreCell;
import com.example.authhexagonal.domain.model.GradeScoreEntry;
import com.example.authhexagonal.domain.model.GradeStudentInfo;
import com.example.authhexagonal.domain.model.GradeSubjectTab;
import com.example.authhexagonal.domain.model.AttendanceStudentSummary;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankArea;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankCreateCommand;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankQuestion;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankRow;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankUpdateCommand;
import com.example.authhexagonal.domain.model.PedagogicalReportArea;
import com.example.authhexagonal.domain.model.PedagogicalReportContent;
import com.example.authhexagonal.domain.model.PedagogicalReportItem;
import com.example.authhexagonal.domain.model.PedagogicalReportSaveCommand;
import com.example.authhexagonal.domain.model.PedagogicalReportView;
import com.example.authhexagonal.domain.model.StudentGradeCard;
import com.example.authhexagonal.domain.model.StudentGradeProfileView;
import com.example.authhexagonal.domain.model.StudentSubjectAverage;
import com.example.authhexagonal.domain.port.in.ManageAttendanceUseCase;
import com.example.authhexagonal.domain.port.in.ManageGradesUseCase;
import com.example.authhexagonal.domain.port.out.ManageGradesPort;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class GradesService implements ManageGradesUseCase {

    private static final double DEFAULT_EVALUATION_WEIGHT = 20.0;
    private static final Set<String> CONCEPT_CODES = Set.of("L", "ML", "PL", "NL", "I", "EP", "OA");
    private static final Set<String> REGISTRATION_TYPES = Set.of("SUMATIVA", "PROCESO", "DIAGNOSTICA");

    private final ManageGradesPort manageGradesPort;
    private final ManageAttendanceUseCase manageAttendanceUseCase;
    private final ObjectMapper objectMapper;

    public GradesService(ManageGradesPort manageGradesPort, ManageAttendanceUseCase manageAttendanceUseCase, ObjectMapper objectMapper) {
        this.manageGradesPort = manageGradesPort;
        this.manageAttendanceUseCase = manageAttendanceUseCase;
        this.objectMapper = objectMapper;
    }

    @Override
    public GradeCatalog getCatalog() {
        int currentYear = LocalDate.now().getYear();
        int preferredSemester = AcademicSemesterResolver.resolveCurrentSemester();
        return new GradeCatalog(
                manageGradesPort.findCoursesWithGrades(),
                manageGradesPort.findActivePeriods().stream()
                        .sorted(Comparator
                                .comparing((GradePeriodOption period) -> period.schoolYear() == currentYear ? 0 : 1)
                                .thenComparing((GradePeriodOption period) ->
                                        period.schoolYear() == currentYear && period.semester() == preferredSemester ? 0 : 1)
                                .thenComparing(GradePeriodOption::schoolYear, Comparator.reverseOrder())
                                .thenComparing(GradePeriodOption::semester))
                        .toList()
        );
    }

    @Override
    public GradeBookView getGradeBook(Long courseId, Long periodId, Long subjectId) {
        GradeCourseOption course = findCourse(courseId);
        GradePeriodOption period = findPeriod(periodId);
        List<GradeSubjectTab> subjects = manageGradesPort.findSubjectsByCourseAndPeriod(courseId, periodId);
        GradeSubjectTab subject = resolveSubject(subjects, subjectId);
        List<GradeEvaluationHeader> evaluations = manageGradesPort.findEvaluations(courseId, periodId, subject.id());
        List<GradeStudentInfo> students = manageGradesPort.findStudentsByCourse(courseId);
        List<GradeScoreEntry> scoreEntries = manageGradesPort.findScores(courseId, periodId, subject.id());
        Map<Long, Map<Long, Double>> scoresByStudent = indexScores(scoreEntries);
        Map<Long, Map<Long, String>> conceptsByStudent = indexConcepts(scoreEntries);
        Map<Long, Map<Long, Double>> percentagesByStudent = indexPercentages(scoreEntries);

        List<GradeBookStudentRow> rows = students.stream()
                .map(student -> buildGradeBookRow(
                        subject.evaluationType(),
                        student,
                        evaluations,
                        scoresByStudent.getOrDefault(student.studentId(), Map.of()),
                        conceptsByStudent.getOrDefault(student.studentId(), Map.of()),
                        percentagesByStudent.getOrDefault(student.studentId(), Map.of())
                ))
                .sorted(Comparator.comparing(GradeBookStudentRow::fullName))
                .toList();

        return new GradeBookView(
                course.id(),
                course.name(),
                period.id(),
                period.name(),
                subject.id(),
                subject.name(),
                subject.evaluationType(),
                buildSummary(rows, subject.evaluationType()),
                subjects,
                evaluations,
                rows
        );
    }

    @Override
    public GradeBookView saveGradeBook(Long courseId, Long periodId, Long subjectId, List<GradeSaveCommand> commands) {
        GradeBookView current = getGradeBook(courseId, periodId, subjectId);
        Set<Long> evaluationIds = current.evaluations().stream()
                .map(GradeEvaluationHeader::id)
                .collect(Collectors.toSet());
        Map<Long, String> evaluationKinds = current.evaluations().stream()
                .collect(Collectors.toMap(GradeEvaluationHeader::id, GradeEvaluationHeader::registrationType));
        Set<Long> studentIds = current.students().stream()
                .map(GradeBookStudentRow::studentId)
                .collect(Collectors.toSet());

        List<GradeSaveCommand> sanitized = commands.stream()
                .filter(command -> command.studentId() != null && studentIds.contains(command.studentId()))
                .filter(command -> command.evaluationId() != null && evaluationIds.contains(command.evaluationId()))
                .map(command -> sanitizeCommand(command, current.subjectEvaluationType(), evaluationKinds.get(command.evaluationId())))
                .toList();

        manageGradesPort.saveScores(sanitized);
        return getGradeBook(courseId, periodId, subjectId);
    }

    @Override
    public GradeBookView createEvaluation(GradeEvaluationCommand command) {
        GradeBookView current = getValidatedGradeBook(command);
        int nextOrder = current.evaluations().stream()
                .mapToInt(GradeEvaluationHeader::order)
                .max()
                .orElse(0) + 1;

        manageGradesPort.createEvaluation(sanitizeEvaluationCommand(command), nextOrder);
        return getGradeBook(command.courseId(), command.periodId(), command.subjectId());
    }

    @Override
    public GradeBookView updateEvaluation(Long evaluationId, GradeEvaluationCommand command) {
        getValidatedGradeBook(command);
        boolean updated = manageGradesPort.updateEvaluation(evaluationId, sanitizeEvaluationCommand(command));
        if (!updated) {
            throw new ResourceNotFoundException("Evaluation not found");
        }
        return getGradeBook(command.courseId(), command.periodId(), command.subjectId());
    }

    @Override
    public GradeBookView deleteEvaluation(Long evaluationId, Long courseId, Long periodId, Long subjectId) {
        findCourse(courseId);
        findPeriod(periodId);
        resolveSubject(manageGradesPort.findSubjectsByCourseAndPeriod(courseId, periodId), subjectId);

        boolean deleted = manageGradesPort.deactivateEvaluation(evaluationId, courseId, periodId, subjectId);
        if (!deleted) {
            throw new ResourceNotFoundException("Evaluation not found");
        }
        return getGradeBook(courseId, periodId, subjectId);
    }

    @Override
    public StudentGradeProfileView getStudentProfile(Long courseId, Long periodId) {
        GradeCourseOption course = findCourse(courseId);
        GradePeriodOption period = findPeriod(periodId);
        return new StudentGradeProfileView(
                course.id(),
                course.name(),
                period.id(),
                period.name(),
                buildStudentCards(course, period)
        );
    }

    @Override
    public GradeReportView getGradeReports(Long courseId, Long periodId) {
        GradeCourseOption course = findCourse(courseId);
        GradePeriodOption period = findPeriod(periodId);
        return new GradeReportView(
                course.id(),
                course.name(),
                period.id(),
                period.name(),
                buildStudentCards(course, period)
        );
    }

    @Override
    public List<PedagogicalQuestionBankArea> getPedagogicalQuestionBank(String levelCode) {
        String resolvedLevelCode = normalizeLevelCode(levelCode);
        Map<String, List<PedagogicalQuestionBankQuestion>> groupedQuestions = manageGradesPort.findPedagogicalQuestionBank(resolvedLevelCode).stream()
                .collect(Collectors.groupingBy(
                        PedagogicalQuestionBankRow::areaKey,
                        LinkedHashMap::new,
                        Collectors.mapping(
                                row -> new PedagogicalQuestionBankQuestion(row.id(), row.levelCode(), row.questionKind(), row.questionText(), row.sortOrder()),
                                Collectors.collectingAndThen(Collectors.toList(), list -> list.stream()
                                        .sorted(Comparator.comparing(PedagogicalQuestionBankQuestion::sortOrder).thenComparing(PedagogicalQuestionBankQuestion::id))
                                        .toList())
                        )
                ));

        return groupedQuestions.entrySet().stream()
                .map(entry -> new PedagogicalQuestionBankArea(
                        entry.getKey(),
                        areaTitle(entry.getKey()),
                        resolveAreaLevelCode(entry.getValue(), resolvedLevelCode),
                        areaQuestionKind(entry.getKey()),
                        entry.getValue()
                ))
                .toList();
    }

    @Override
    public PedagogicalQuestionBankQuestion createPedagogicalQuestionBankQuestion(PedagogicalQuestionBankCreateCommand command) {
        String areaKey = safeText(command.areaKey());
        String levelCode = normalizeLevelCode(command.levelCode());
        String questionKind = normalizeQuestionKind(command.questionKind());
        String questionText = safeText(command.questionText());
        if (areaKey.isBlank() || questionText.isBlank()) {
            throw new IllegalArgumentException("Area y pregunta son obligatorias");
        }

        Long questionId = manageGradesPort.createPedagogicalQuestionBankQuestion(areaKey, levelCode, questionKind, questionText);
        return manageGradesPort.findPedagogicalQuestionBankQuestionById(questionId)
                .map(this::toPedagogicalQuestionBankQuestion)
                .orElseThrow(() -> new IllegalArgumentException("No fue posible crear la pregunta pedagogica"));
    }

    @Override
    public PedagogicalQuestionBankQuestion updatePedagogicalQuestionBankQuestion(PedagogicalQuestionBankUpdateCommand command) {
        String questionText = safeText(command.questionText());
        if (command.questionId() == null || command.questionId() <= 0 || questionText.isBlank()) {
            throw new IllegalArgumentException("Pregunta invalida");
        }
        boolean updated = manageGradesPort.updatePedagogicalQuestionBankQuestion(command.questionId(), questionText);
        if (!updated) {
            throw new IllegalArgumentException("No fue posible actualizar la pregunta pedagogica");
        }
        return manageGradesPort.findPedagogicalQuestionBankQuestionById(command.questionId())
                .map(this::toPedagogicalQuestionBankQuestion)
                .orElseThrow(() -> new IllegalArgumentException("No fue posible obtener la pregunta actualizada"));
    }

    @Override
    public void deletePedagogicalQuestionBankQuestion(Long questionId) {
        if (questionId == null || questionId <= 0) {
            throw new IllegalArgumentException("Pregunta invalida");
        }
        boolean deleted = manageGradesPort.deactivatePedagogicalQuestionBankQuestion(questionId);
        if (!deleted) {
            throw new IllegalArgumentException("No fue posible eliminar la pregunta pedagogica");
        }
    }

    @Override
    public PedagogicalReportView getPedagogicalReport(Long courseId, Long periodId, Long studentId) {
        GradeCourseOption course = findCourse(courseId);
        GradePeriodOption period = findPeriod(periodId);
        GradeStudentInfo student = findStudent(courseId, studentId);
        String levelCode = resolveCourseLevelCode(course.name());
        String levelLabel = resolveCourseLevelLabel(levelCode);

        PedagogicalReportContent content = manageGradesPort.findPedagogicalReportContent(courseId, periodId, studentId)
                .map(this::deserializePedagogicalContent)
                .orElseGet(() -> buildDefaultPedagogicalContent(levelCode));

        return new PedagogicalReportView(
                course.id(),
                course.name(),
                period.id(),
                period.name(),
                student.studentId(),
                student.run(),
                student.fullName(),
                course.schoolYear(),
                levelCode,
                levelLabel,
                normalizePedagogicalContent(content, levelCode)
        );
    }

    @Override
    public PedagogicalReportView savePedagogicalReport(PedagogicalReportSaveCommand command) {
        if (command.courseId() == null || command.periodId() == null || command.studentId() == null) {
            throw new IllegalArgumentException("Course, period and student are required");
        }

        PedagogicalReportView view = getPedagogicalReport(command.courseId(), command.periodId(), command.studentId());
        PedagogicalReportContent sanitizedContent = normalizePedagogicalContent(
                command.content() == null ? view.content() : command.content(),
                view.levelCode()
        );

        manageGradesPort.savePedagogicalReportContent(
                command.courseId(),
                command.periodId(),
                command.studentId(),
                serializePedagogicalContent(sanitizedContent)
        );

        return new PedagogicalReportView(
                view.courseId(),
                view.courseName(),
                view.periodId(),
                view.periodName(),
                view.studentId(),
                view.studentRun(),
                view.studentName(),
                view.schoolYear(),
                view.levelCode(),
                view.levelLabel(),
                sanitizedContent
        );
    }

    private GradeCourseOption findCourse(Long courseId) {
        return manageGradesPort.findCourseById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    }

    private GradePeriodOption findPeriod(Long periodId) {
        return manageGradesPort.findPeriodById(periodId)
                .orElseThrow(() -> new ResourceNotFoundException("Academic period not found"));
    }

    private GradeStudentInfo findStudent(Long courseId, Long studentId) {
        return manageGradesPort.findStudentsByCourse(courseId).stream()
                .filter(student -> student.studentId().equals(studentId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Student not found for selected course"));
    }

    private GradeSubjectTab resolveSubject(List<GradeSubjectTab> subjects, Long subjectId) {
        if (subjects.isEmpty()) {
            throw new ResourceNotFoundException("No active subjects found for the selected course");
        }

        if (subjectId == null) {
            return subjects.getFirst();
        }

        return subjects.stream()
                .filter(subject -> subject.id().equals(subjectId))
                .findFirst()
                .orElse(subjects.getFirst());
    }

    private GradeBookView getValidatedGradeBook(GradeEvaluationCommand command) {
        if (command.courseId() == null || command.periodId() == null || command.subjectId() == null) {
            throw new IllegalArgumentException("Course, period and subject are required");
        }
        return getGradeBook(command.courseId(), command.periodId(), command.subjectId());
    }

    private String resolveCourseLevelCode(String courseName) {
        String normalized = normalizeCourseName(courseName);
        if (normalized.contains("PREK") || normalized.contains("PRE-K") || normalized.matches(".*\\bPK\\b.*")) {
            return "PREKINDER";
        }
        if (normalized.contains("KINDER") || normalized.matches(".*\\bK\\b.*")) {
            return "KINDER";
        }
        return "GENERAL";
    }

    private String resolveCourseLevelLabel(String levelCode) {
        String normalized = normalizeLevelCode(levelCode);
        if ("PREKINDER".equals(normalized)) {
            return "Prekinder";
        }
        if ("KINDER".equals(normalized)) {
            return "Kinder";
        }
        return "Curso";
    }

    private PedagogicalReportContent deserializePedagogicalContent(String contentJson) {
        try {
            return objectMapper.readValue(contentJson, PedagogicalReportContent.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Stored pedagogical report content is invalid", exception);
        }
    }

    private String serializePedagogicalContent(PedagogicalReportContent content) {
        try {
            return objectMapper.writeValueAsString(content);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Pedagogical report content could not be serialized", exception);
        }
    }

    private PedagogicalReportContent normalizePedagogicalContent(PedagogicalReportContent content, String levelCode) {
        String resolvedLevelCode = normalizeLevelCode(levelCode);
        PedagogicalReportContent base = content == null ? buildPedagogicalContentFromBank(resolvedLevelCode) : content;
        List<PedagogicalReportArea> defaultAreas = fallbackDevelopmentAreas(resolvedLevelCode);
        List<PedagogicalReportArea> normalizedAreas = defaultAreas.stream()
                .map(defaultArea -> mergeAreaWithBank(defaultArea, findArea(base.developmentAreas(), defaultArea.key())))
                .toList();
        PedagogicalReportArea normalizedAttitude = mergeAreaWithBank(fallbackAttitudeArea(), base.attitudeArea());
        List<String> recommendations = normalizeFamilyRecommendations(base.familyRecommendations());
        String guardianSignatureLabel = safeText(base.guardianSignatureLabel());
        if (guardianSignatureLabel.isBlank()) {
            guardianSignatureLabel = "Recibido conforme - Fecha: ___/___/______";
        }

        return new PedagogicalReportContent(
                safeText(base.documentTitle()).isBlank() ? "Informe de avance" : safeText(base.documentTitle()),
                safeText(base.educatorName()),
                normalizedAreas,
                normalizedAttitude,
                recommendations,
                safeText(base.teacherSignatureName()),
                guardianSignatureLabel
        );
    }

    private List<String> normalizeFamilyRecommendations(List<String> recommendations) {
        if (recommendations == null || recommendations.isEmpty()) {
            return List.of("");
        }

        return recommendations.stream()
                .map(this::safeText)
                .filter(text -> !text.isBlank())
                .findFirst()
                .map(List::of)
                .orElseGet(() -> List.of(""));
    }

    private PedagogicalQuestionBankQuestion toPedagogicalQuestionBankQuestion(PedagogicalQuestionBankRow row) {
        return new PedagogicalQuestionBankQuestion(
                row.id(),
                row.levelCode(),
                row.questionKind(),
                safeText(row.questionText()),
                row.sortOrder()
        );
    }

    private String resolveAreaLevelCode(List<PedagogicalQuestionBankQuestion> questions, String requestedLevelCode) {
        return questions.stream()
                .map(PedagogicalQuestionBankQuestion::levelCode)
                .filter(level -> level != null && !level.isBlank())
                .findFirst()
                .orElse(requestedLevelCode);
    }

    private String normalizeQuestionKind(String questionKind) {
        String normalized = safeText(questionKind).toUpperCase(Locale.ROOT);
        return "RECOMMENDATION".equals(normalized) ? "RECOMMENDATION" : "AREA";
    }

    private PedagogicalReportArea mergeArea(PedagogicalReportArea defaultArea, PedagogicalReportArea currentArea) {
        List<PedagogicalReportItem> currentItems = currentArea == null || currentArea.items() == null ? List.of() : currentArea.items();
        List<PedagogicalReportItem> mergedItems = defaultArea.items().stream()
                .map(defaultItem -> {
                    PedagogicalReportItem matched = currentItems.stream()
                            .filter(item -> item.questionId() != null && item.questionId().equals(defaultItem.questionId()))
                            .findFirst()
                            .orElseGet(() -> currentItems.stream()
                                    .filter(item -> safeText(item.label()).equalsIgnoreCase(defaultItem.label()))
                                    .findFirst()
                                    .orElse(null));
                    String normalizedAnswer = matched == null ? defaultItem.answer() : normalizePedagogicalAnswer(matched.answer(), matched.achieved());
                    return new PedagogicalReportItem(defaultItem.questionId(), defaultItem.label(), normalizedAnswer, null);
                })
                .limit(4)
                .toList();

        return new PedagogicalReportArea(
                defaultArea.key(),
                defaultArea.title(),
                defaultArea.icon(),
                defaultArea.accentColor(),
                defaultArea.iconColor(),
                mergedItems,
                currentArea == null ? "" : safeText(currentArea.observation())
        );
    }

    private PedagogicalReportArea findArea(List<PedagogicalReportArea> areas, String key) {
        if (areas == null) {
            return null;
        }
        return areas.stream()
                .filter(area -> safeText(area.key()).equalsIgnoreCase(key))
                .findFirst()
                .orElse(null);
    }

    private PedagogicalReportContent buildDefaultPedagogicalContent(String levelCode) {
        return new PedagogicalReportContent(
                "Informe de avance",
                "",
                defaultDevelopmentAreas(levelCode),
                defaultAttitudeArea(),
                List.of(""),
                "",
                "Recibido conforme - Fecha: ___/___/______"
        );
    }

    private List<PedagogicalReportArea> defaultDevelopmentAreas(String levelCode) {
        List<String> cognitiveItems = "KINDER".equals(levelCode)
                ? List.of(
                "Reconoce colores, formas y tamanos",
                "Grafema y fonema de vocales y consonantes M y P",
                "Escritura y conteo numeros 1 al 50",
                "Juegos simbolicos y actividades creativas"
        )
                : List.of(
                "Reconoce colores, formas y tamanos",
                "Grafema y fonema de las vocales",
                "Escritura y conteo numeros 1 al 10",
                "Juegos simbolicos y actividades creativas"
        );

        return List.of(
                area("personal-social", "Personal y Social", "favorite", "#d1fae5", "#065f46",
                        List.of(
                                "Establece vinculos afectivos con pares y adultos",
                                "Expresa sus emociones con claridad",
                                "Comparte materiales y colabora en grupo",
                                "Muestra autonomia en rutinas diarias"
                        )),
                area("lenguaje-verbal", "Lenguaje Verbal", "chat", "#dbeafe", "#1e40af",
                        List.of(
                                "Comprende instrucciones simples y relatos",
                                "Vocabulario adecuado para su edad",
                                "Participa en conversaciones y juegos",
                                "Interes por cuentos, canciones y dramatizaciones"
                        )),
                area("area-motriz", "Area Motriz", "directions_run", "#fef3c7", "#92400e",
                        List.of(
                                "Control y coordinacion de movimientos",
                                "Participa activamente en juegos al aire libre",
                                "Utiliza lapices, tijeras y pinceles correctamente",
                                "Realiza trazos y formas con intencion"
                        )),
                area("area-cognitiva", "Area Cognitiva", "lightbulb", "#ede9fe", "#5b21b6", cognitiveItems)
        );
    }

    private PedagogicalReportArea defaultAttitudeArea() {
        return area(
                "actitudes-aprendizaje",
                "Actitudes y disposicion al aprendizaje",
                "stars",
                "#f0fdf4",
                "#15803d",
                List.of(
                        "Interes y entusiasmo por actividades",
                        "Respeto por las normas del aula",
                        "Perseverancia frente a desafios",
                        "Disposicion para aprender y explorar"
                )
        );
    }

    private PedagogicalReportArea area(
            String key,
            String title,
            String icon,
            String accentColor,
            String iconColor,
            List<String> labels
    ) {
        return new PedagogicalReportArea(
                key,
                title,
                icon,
                accentColor,
                iconColor,
                labels.stream().map(label -> new PedagogicalReportItem(null, label, "NO", false)).toList(),
                ""
        );
    }

    private PedagogicalReportContent buildPedagogicalContentFromBank(String levelCode) {
        List<PedagogicalReportArea> developmentAreas = bankBackedDevelopmentAreas(levelCode);
        PedagogicalReportArea attitudeArea = bankBackedAttitudeArea();
        boolean hasBankContent = developmentAreas.stream().anyMatch(area -> !area.items().isEmpty())
                && !attitudeArea.items().isEmpty();
        if (!hasBankContent) {
            return buildDefaultPedagogicalContent(levelCode);
        }

        return new PedagogicalReportContent(
                "Informe de avance",
                "",
                developmentAreas,
                attitudeArea,
                List.of(""),
                "",
                "Recibido conforme - Fecha: ___/___/______"
        );
    }

    private List<PedagogicalReportArea> fallbackDevelopmentAreas(String levelCode) {
        List<PedagogicalReportArea> bankAreas = bankBackedDevelopmentAreas(levelCode);
        return bankAreas.stream().anyMatch(area -> !area.items().isEmpty()) ? bankAreas : defaultDevelopmentAreas(levelCode);
    }

    private PedagogicalReportArea fallbackAttitudeArea() {
        PedagogicalReportArea bankArea = bankBackedAttitudeArea();
        return bankArea.items().isEmpty() ? defaultAttitudeArea() : bankArea;
    }

    private List<PedagogicalReportArea> bankBackedDevelopmentAreas(String levelCode) {
        return List.of(
                bankBackedArea("personal-social", "Personal y Social", "favorite", "#d1fae5", "#065f46", levelCode),
                bankBackedArea("lenguaje-verbal", "Lenguaje Verbal", "chat", "#dbeafe", "#1e40af", levelCode),
                bankBackedArea("area-motriz", "Area Motriz", "directions_run", "#fef3c7", "#92400e", levelCode),
                bankBackedArea("area-cognitiva", "Area Cognitiva", "lightbulb", "#ede9fe", "#5b21b6", levelCode)
        );
    }

    private PedagogicalReportArea bankBackedAttitudeArea() {
        return bankBackedArea("actitudes-aprendizaje", "Actitudes y disposicion al aprendizaje", "stars", "#f0fdf4", "#15803d", "GENERAL");
    }

    private PedagogicalReportArea bankBackedArea(
            String key,
            String title,
            String icon,
            String accentColor,
            String iconColor,
            String levelCode
    ) {
        List<PedagogicalQuestionBankRow> rows = manageGradesPort.findPedagogicalQuestionBank(normalizeLevelCode(levelCode)).stream()
                .filter(row -> safeText(row.areaKey()).equalsIgnoreCase(key))
                .filter(row -> "AREA".equalsIgnoreCase(row.questionKind()))
                .sorted(Comparator.comparing(PedagogicalQuestionBankRow::sortOrder).thenComparing(PedagogicalQuestionBankRow::id))
                .limit(4)
                .toList();

        if (rows.isEmpty()) {
            return new PedagogicalReportArea(key, title, icon, accentColor, iconColor, List.of(), "");
        }

        return new PedagogicalReportArea(
                key,
                title,
                icon,
                accentColor,
                iconColor,
                rows.stream()
                        .map(row -> new PedagogicalReportItem(row.id(), safeText(row.questionText()), "NO", null))
                        .toList(),
                ""
        );
    }

    private PedagogicalReportArea mergeAreaWithBank(PedagogicalReportArea defaultArea, PedagogicalReportArea currentArea) {
        List<PedagogicalReportItem> currentItems = currentArea == null || currentArea.items() == null ? List.of() : currentArea.items();
        List<PedagogicalReportItem> mergedItems;

        if (!currentItems.isEmpty()) {
            mergedItems = currentItems.stream()
                    .limit(4)
                    .map(currentItem -> {
                        PedagogicalReportItem bankItem = defaultArea.items().stream()
                                .filter(item -> currentItem.questionId() != null && currentItem.questionId().equals(item.questionId()))
                                .findFirst()
                                .orElseGet(() -> defaultArea.items().stream()
                                        .filter(item -> safeText(item.label()).equalsIgnoreCase(currentItem.label()))
                                        .findFirst()
                                        .orElse(null));

                        String answer = normalizePedagogicalAnswer(currentItem.answer(), currentItem.achieved());
                        if (bankItem != null) {
                            return new PedagogicalReportItem(bankItem.questionId(), bankItem.label(), answer, null);
                        }
                        return new PedagogicalReportItem(currentItem.questionId(), safeText(currentItem.label()), answer, null);
                    })
                    .toList();

            if (mergedItems.size() < 4) {
                List<Long> selectedIds = mergedItems.stream()
                        .map(PedagogicalReportItem::questionId)
                        .filter(Objects::nonNull)
                        .toList();
                List<String> selectedLabels = mergedItems.stream()
                        .map(item -> safeText(item.label()).toLowerCase(Locale.ROOT))
                        .toList();

                List<PedagogicalReportItem> fillerItems = defaultArea.items().stream()
                        .filter(item -> item.questionId() == null || !selectedIds.contains(item.questionId()))
                        .filter(item -> !selectedLabels.contains(safeText(item.label()).toLowerCase(Locale.ROOT)))
                        .limit(4L - mergedItems.size())
                        .map(item -> new PedagogicalReportItem(item.questionId(), item.label(), item.answer(), null))
                        .toList();

                mergedItems = Stream.concat(mergedItems.stream(), fillerItems.stream())
                        .limit(4)
                        .toList();
            }
        } else {
            mergedItems = defaultArea.items().stream()
                    .limit(4)
                    .map(defaultItem -> new PedagogicalReportItem(
                            defaultItem.questionId(),
                            defaultItem.label(),
                            normalizePedagogicalAnswer(defaultItem.answer(), defaultItem.achieved()),
                            null
                    ))
                    .toList();
        }

        return new PedagogicalReportArea(
                defaultArea.key(),
                defaultArea.title(),
                defaultArea.icon(),
                defaultArea.accentColor(),
                defaultArea.iconColor(),
                mergedItems,
                currentArea == null ? "" : safeText(currentArea.observation())
        );
    }

    private String normalizePedagogicalAnswer(String answer, Boolean achieved) {
        String normalized = safeText(answer).toUpperCase();
        if (Set.of("SI", "NO", "EP").contains(normalized)) {
            return normalized;
        }
        if (achieved != null) {
            return achieved ? "SI" : "NO";
        }
        return "NO";
    }

    private String normalizeLevelCode(String levelCode) {
        String normalized = safeText(levelCode).toUpperCase();
        return Set.of("PREKINDER", "KINDER", "GENERAL").contains(normalized) ? normalized : "GENERAL";
    }

    private String normalizeCourseName(String courseName) {
        String normalized = Normalizer.normalize(safeText(courseName), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return normalized.toUpperCase();
    }

    private String areaTitle(String areaKey) {
        return switch (safeText(areaKey).toLowerCase()) {
            case "personal-social" -> "Personal y Social";
            case "lenguaje-verbal" -> "Lenguaje Verbal";
            case "area-motriz" -> "Area Motriz";
            case "area-cognitiva" -> "Area Cognitiva";
            case "actitudes-aprendizaje" -> "Actitudes y disposicion al aprendizaje";
            case "family-recommendations" -> "Recomendaciones a la familia";
            default -> safeText(areaKey);
        };
    }

    private String areaQuestionKind(String areaKey) {
        return "family-recommendations".equalsIgnoreCase(safeText(areaKey)) ? "RECOMMENDATION" : "AREA";
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private Map<Long, Map<Long, Double>> indexScores(List<GradeScoreEntry> entries) {
        Map<Long, Map<Long, Double>> indexed = new HashMap<>();
        for (GradeScoreEntry entry : entries) {
            indexed.computeIfAbsent(entry.studentId(), ignored -> new HashMap<>())
                    .put(entry.evaluationId(), entry.score());
        }
        return indexed;
    }

    private Map<Long, Map<Long, String>> indexConcepts(List<GradeScoreEntry> entries) {
        Map<Long, Map<Long, String>> indexed = new HashMap<>();
        for (GradeScoreEntry entry : entries) {
            indexed.computeIfAbsent(entry.studentId(), ignored -> new HashMap<>())
                    .put(entry.evaluationId(), entry.conceptCode());
        }
        return indexed;
    }

    private Map<Long, Map<Long, Double>> indexPercentages(List<GradeScoreEntry> entries) {
        Map<Long, Map<Long, Double>> indexed = new HashMap<>();
        for (GradeScoreEntry entry : entries) {
            indexed.computeIfAbsent(entry.studentId(), ignored -> new HashMap<>())
                    .put(entry.evaluationId(), entry.percentage());
        }
        return indexed;
    }

    private GradeBookStudentRow buildGradeBookRow(
            String evaluationType,
            GradeStudentInfo student,
            List<GradeEvaluationHeader> evaluations,
            Map<Long, Double> studentScores
    ) {
        return buildGradeBookRow(
                evaluationType,
                student,
                evaluations,
                studentScores,
                Map.of(),
                Map.of()
        );
    }

    private GradeBookStudentRow buildGradeBookRow(
            String evaluationType,
            GradeStudentInfo student,
            List<GradeEvaluationHeader> evaluations,
            Map<Long, Double> studentScores,
            Map<Long, String> studentConcepts,
            Map<Long, Double> studentPercentages
    ) {
        List<GradeScoreCell> scoreCells = evaluations.stream()
                .map(evaluation -> new GradeScoreCell(
                        evaluation.id(),
                        evaluation.code(),
                        studentScores.get(evaluation.id()),
                        studentConcepts.get(evaluation.id()),
                        studentPercentages.get(evaluation.id()),
                        evaluation.registrationType()
                ))
                .toList();

        if (isConceptual(evaluationType)) {
            String conceptSummaryCode = latestConceptCode(scoreCells);
            return new GradeBookStudentRow(
                    student.studentId(),
                    student.run(),
                    student.fullName(),
                    scoreCells,
                    null,
                    conceptLabel(conceptSummaryCode),
                    conceptSummaryCode
            );
        }

        Double average = round(scoreCells.stream()
                .filter(cell -> !"DIAGNOSTICA".equalsIgnoreCase(cell.registrationType()))
                .map(GradeScoreCell::score)
                .filter(score -> score != null)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(Double.NaN));

        return new GradeBookStudentRow(
                student.studentId(),
                student.run(),
                student.fullName(),
                scoreCells,
                Double.isNaN(average) ? null : average,
                resolveStatus(Double.isNaN(average) ? null : average),
                null
        );
    }

    private GradeBookSummary buildSummary(List<GradeBookStudentRow> rows, String evaluationType) {
        if (isConceptual(evaluationType)) {
            return new GradeBookSummary(null, 0, 0, rows.size());
        }
        List<Double> averages = rows.stream()
                .map(GradeBookStudentRow::average)
                .filter(average -> average != null)
                .toList();

        Double courseAverage = averages.isEmpty()
                ? null
                : round(averages.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));

        int aboveMinimum = (int) averages.stream().filter(average -> average >= 4.0).count();
        int belowMinimum = (int) averages.stream().filter(average -> average < 4.0).count();
        int ungraded = (int) rows.stream().filter(row -> row.average() == null).count();

        return new GradeBookSummary(courseAverage, aboveMinimum, belowMinimum, ungraded);
    }

    private List<StudentGradeCard> buildStudentCards(GradeCourseOption course, GradePeriodOption period) {
        Map<Long, StudentGradeCardBuilder> builders = new LinkedHashMap<>();
        for (ManageGradesPort.StudentSubjectAverageRow row : manageGradesPort.findStudentSubjectAverages(course.id(), period.id())) {
            StudentGradeCardBuilder builder = builders.computeIfAbsent(
                    row.studentId(),
                    ignored -> new StudentGradeCardBuilder(row.studentId(), row.run(), row.fullName())
            );
            builder.subjects.add(new StudentSubjectAverage(
                    row.subjectId(),
                    row.subjectName(),
                    row.colorHex(),
                    row.average(),
                    row.evaluationType(),
                    row.conceptSummaryCode()
            ));
        }

        return builders.values().stream()
                .map(builder -> builder.build(resolveAttendancePercentage(course, period, builder.studentId)))
                .sorted(Comparator.comparing(StudentGradeCard::fullName))
                .toList();
    }

    private Integer resolveAttendancePercentage(GradeCourseOption course, GradePeriodOption period, Long studentId) {
        try {
            AttendanceStudentSummary summary = manageAttendanceUseCase.getStudentAttendanceSummary(
                    course.id(),
                    studentId,
                    course.schoolYear(),
                    period.semester()
            );
            return summary == null ? 0 : summary.percentage();
        } catch (Exception ignored) {
            return 0;
        }
    }

    private GradeSaveCommand sanitizeCommand(GradeSaveCommand command, String evaluationType, String registrationType) {
        if (isConceptual(evaluationType)) {
            String conceptCode = normalizeConceptCode(command.conceptCode());
            return new GradeSaveCommand(command.studentId(), command.evaluationId(), null, conceptCode, null);
        }

        if ("DIAGNOSTICA".equalsIgnoreCase(registrationType)) {
            String conceptCode = normalizeConceptCode(command.conceptCode());
            if (conceptCode != null) {
                return new GradeSaveCommand(command.studentId(), command.evaluationId(), null, conceptCode, null);
            }

            Double percentage = command.percentage();
            if (percentage == null) {
                return new GradeSaveCommand(command.studentId(), command.evaluationId(), null, null, null);
            }
            if (percentage < 0.0 || percentage > 100.0) {
                throw new IllegalArgumentException("Diagnostic percentage must be between 0 and 100");
            }
            double normalizedPercentage = Math.round(percentage * 10.0) / 10.0;
            return new GradeSaveCommand(
                    command.studentId(),
                    command.evaluationId(),
                    null,
                    diagnosticConcept(normalizedPercentage),
                    normalizedPercentage
            );
        }

        Double score = command.score();
        if (score == null) {
            return new GradeSaveCommand(command.studentId(), command.evaluationId(), null, null, null);
        }

        if (score < 1.0 || score > 7.0) {
            throw new IllegalArgumentException("Grade must be between 1.0 and 7.0");
        }

        return new GradeSaveCommand(
                command.studentId(),
                command.evaluationId(),
                round(score),
                null,
                null
        );
    }

    private GradeEvaluationCommand sanitizeEvaluationCommand(GradeEvaluationCommand command) {
        String code = command.code() == null ? "" : command.code().trim();
        String name = command.name() == null ? "" : command.name().trim();
        if (code.isBlank() || name.isBlank()) {
            throw new IllegalArgumentException("Evaluation code and name are required");
        }

        Double weight = command.weight() == null ? DEFAULT_EVALUATION_WEIGHT : command.weight();
        if (weight < 0.0 || weight > 100.0) {
            throw new IllegalArgumentException("Evaluation weight must be between 0 and 100");
        }
        weight = Math.round(weight * 100.0) / 100.0;
        String registrationType = normalizeRegistrationType(command.registrationType());
        if ("DIAGNOSTICA".equals(registrationType)) {
            weight = 0.0;
        }

        return new GradeEvaluationCommand(
                command.courseId(),
                command.periodId(),
                command.subjectId(),
                code,
                name,
                weight,
                command.evaluationDate(),
                registrationType
        );
    }

    private Double round(Double value) {
        if (value == null) {
            return null;
        }
        return Math.round(value * 10.0) / 10.0;
    }

    private String resolveStatus(Double average) {
        if (average == null) {
            return "Sin notas";
        }
        if (average >= 6.0) {
            return "Destacado";
        }
        if (average >= 4.0) {
            return "Aprobado";
        }
        return "Riesgo";
    }

    private boolean isConceptual(String evaluationType) {
        return "CONCEPTUAL".equalsIgnoreCase(evaluationType);
    }

    private String normalizeRegistrationType(String registrationType) {
        if (registrationType == null || registrationType.isBlank()) {
            return "SUMATIVA";
        }
        String normalized = registrationType.trim().toUpperCase();
        if (!REGISTRATION_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("Invalid evaluation registration type");
        }
        return normalized;
    }

    private String diagnosticConcept(double percentage) {
        if (percentage < 50.0) {
            return "PL";
        }
        if (percentage < 70.0) {
            return "ML";
        }
        return "L";
    }

    private String normalizeConceptCode(String conceptCode) {
        if (conceptCode == null || conceptCode.isBlank()) {
            return null;
        }
        String normalized = conceptCode.trim().toUpperCase();
        if (!CONCEPT_CODES.contains(normalized)) {
            throw new IllegalArgumentException("Invalid conceptual grade value");
        }
        return normalized;
    }

    private String latestConceptCode(List<GradeScoreCell> scoreCells) {
        for (int index = scoreCells.size() - 1; index >= 0; index--) {
            String conceptCode = scoreCells.get(index).conceptCode();
            if (conceptCode != null && !conceptCode.isBlank()) {
                return conceptCode;
            }
        }
        return null;
    }

    private String conceptLabel(String conceptCode) {
        if (conceptCode == null || conceptCode.isBlank()) {
            return "Sin registro";
        }
        return switch (conceptCode) {
            case "L" -> "Logrado";
            case "ML" -> "Medianamente logrado";
            case "PL" -> "Por lograr";
            case "NL" -> "No logrado";
            case "I" -> "Iniciado";
            case "EP" -> "En proceso";
            case "OA" -> "Objetivo alcanzado";
            default -> conceptCode;
        };
    }

    private static final class StudentGradeCardBuilder {
        private final Long studentId;
        private final String run;
        private final String fullName;
        private final List<StudentSubjectAverage> subjects = new ArrayList<>();

        private StudentGradeCardBuilder(Long studentId, String run, String fullName) {
            this.studentId = studentId;
            this.run = run;
            this.fullName = fullName;
        }

        private StudentGradeCard build(Integer attendancePercentage) {
            Double overallAverage = subjects.stream()
                    .map(StudentSubjectAverage::average)
                    .filter(average -> average != null)
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .stream()
                    .boxed()
                    .findFirst()
                    .map(value -> Math.round(value * 10.0) / 10.0)
                    .orElse(null);

            subjects.sort(Comparator.comparing(StudentSubjectAverage::subjectName));

            String status = overallAverage == null
                    ? "Sin notas"
                    : overallAverage >= 6.0
                    ? "Destacado"
                    : overallAverage >= 4.0
                    ? "Aprobado"
                    : "Riesgo";

            return new StudentGradeCard(
                    studentId,
                    run,
                    fullName,
                    overallAverage,
                    attendancePercentage == null ? 0 : attendancePercentage,
                    status,
                    List.copyOf(subjects)
            );
        }
    }
}
