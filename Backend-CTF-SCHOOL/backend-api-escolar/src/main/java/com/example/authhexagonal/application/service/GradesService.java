package com.example.authhexagonal.application.service;

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
import com.example.authhexagonal.domain.model.StudentGradeCard;
import com.example.authhexagonal.domain.model.StudentGradeProfileView;
import com.example.authhexagonal.domain.model.StudentSubjectAverage;
import com.example.authhexagonal.domain.port.in.ManageGradesUseCase;
import com.example.authhexagonal.domain.port.out.ManageGradesPort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class GradesService implements ManageGradesUseCase {

    private static final double DEFAULT_EVALUATION_WEIGHT = 20.0;

    private final ManageGradesPort manageGradesPort;

    public GradesService(ManageGradesPort manageGradesPort) {
        this.manageGradesPort = manageGradesPort;
    }

    @Override
    public GradeCatalog getCatalog() {
        return new GradeCatalog(
                manageGradesPort.findCoursesWithGrades(),
                manageGradesPort.findActivePeriods()
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
        Map<Long, Map<Long, Double>> scoresByStudent = indexScores(
                manageGradesPort.findScores(courseId, periodId, subject.id())
        );

        List<GradeBookStudentRow> rows = students.stream()
                .map(student -> buildGradeBookRow(student, evaluations, scoresByStudent.getOrDefault(student.studentId(), Map.of())))
                .sorted(Comparator.comparing(GradeBookStudentRow::fullName))
                .toList();

        return new GradeBookView(
                course.id(),
                course.name(),
                period.id(),
                period.name(),
                subject.id(),
                subject.name(),
                buildSummary(rows),
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
        Set<Long> studentIds = current.students().stream()
                .map(GradeBookStudentRow::studentId)
                .collect(Collectors.toSet());

        List<GradeSaveCommand> sanitized = commands.stream()
                .filter(command -> command.studentId() != null && studentIds.contains(command.studentId()))
                .filter(command -> command.evaluationId() != null && evaluationIds.contains(command.evaluationId()))
                .map(this::sanitizeCommand)
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
                buildStudentCards(courseId, periodId)
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
                buildStudentCards(courseId, periodId)
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

    private Map<Long, Map<Long, Double>> indexScores(List<GradeScoreEntry> entries) {
        Map<Long, Map<Long, Double>> indexed = new HashMap<>();
        for (GradeScoreEntry entry : entries) {
            indexed.computeIfAbsent(entry.studentId(), ignored -> new HashMap<>())
                    .put(entry.evaluationId(), entry.score());
        }
        return indexed;
    }

    private GradeBookStudentRow buildGradeBookRow(
            GradeStudentInfo student,
            List<GradeEvaluationHeader> evaluations,
            Map<Long, Double> studentScores
    ) {
        List<GradeScoreCell> scoreCells = evaluations.stream()
                .map(evaluation -> new GradeScoreCell(
                        evaluation.id(),
                        evaluation.code(),
                        studentScores.get(evaluation.id())
                ))
                .toList();

        Double average = round(scoreCells.stream()
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
                resolveStatus(Double.isNaN(average) ? null : average)
        );
    }

    private GradeBookSummary buildSummary(List<GradeBookStudentRow> rows) {
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

    private List<StudentGradeCard> buildStudentCards(Long courseId, Long periodId) {
        Map<Long, StudentGradeCardBuilder> builders = new LinkedHashMap<>();
        for (ManageGradesPort.StudentSubjectAverageRow row : manageGradesPort.findStudentSubjectAverages(courseId, periodId)) {
            StudentGradeCardBuilder builder = builders.computeIfAbsent(
                    row.studentId(),
                    ignored -> new StudentGradeCardBuilder(row.studentId(), row.run(), row.fullName())
            );
            builder.subjects.add(new StudentSubjectAverage(row.subjectId(), row.subjectName(), row.colorHex(), row.average()));
        }

        return builders.values().stream()
                .map(StudentGradeCardBuilder::build)
                .sorted(Comparator.comparing(StudentGradeCard::fullName))
                .toList();
    }

    private GradeSaveCommand sanitizeCommand(GradeSaveCommand command) {
        Double score = command.score();
        if (score == null) {
            return command;
        }

        if (score < 1.0 || score > 7.0) {
            throw new IllegalArgumentException("Grade must be between 1.0 and 7.0");
        }

        return new GradeSaveCommand(
                command.studentId(),
                command.evaluationId(),
                round(score)
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

        return new GradeEvaluationCommand(
                command.courseId(),
                command.periodId(),
                command.subjectId(),
                code,
                name,
                weight,
                command.evaluationDate()
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

        private StudentGradeCard build() {
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

            return new StudentGradeCard(studentId, run, fullName, overallAverage, status, List.copyOf(subjects));
        }
    }
}
