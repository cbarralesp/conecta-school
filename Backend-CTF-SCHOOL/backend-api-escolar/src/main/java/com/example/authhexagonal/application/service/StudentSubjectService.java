package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.StudentDocumentTypeFilter;
import com.example.authhexagonal.domain.model.StudentPortalSubject;
import com.example.authhexagonal.domain.model.StudentSubjectClass;
import com.example.authhexagonal.domain.model.StudentSubjectDocument;
import com.example.authhexagonal.domain.model.StudentSubjectDocumentRow;
import com.example.authhexagonal.domain.model.StudentSubjectDocuments;
import com.example.authhexagonal.domain.model.StudentSubjectHeader;
import com.example.authhexagonal.domain.model.StudentSubjectMetrics;
import com.example.authhexagonal.domain.model.StudentSubjectUnit;
import com.example.authhexagonal.domain.port.in.GetStudentSubjectDocumentsUseCase;
import com.example.authhexagonal.domain.port.in.GetStudentSubjectsUseCase;
import com.example.authhexagonal.domain.port.out.StudentSubjectRepositoryPort;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.text.DecimalFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class StudentSubjectService implements GetStudentSubjectsUseCase, GetStudentSubjectDocumentsUseCase {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.forLanguageTag("es"));
    private static final DecimalFormat SIZE_FORMAT = new DecimalFormat("#.#");

    private final StudentSubjectRepositoryPort studentSubjectRepositoryPort;

    public StudentSubjectService(StudentSubjectRepositoryPort studentSubjectRepositoryPort) {
        this.studentSubjectRepositoryPort = studentSubjectRepositoryPort;
    }

    @Override
    public List<StudentPortalSubject> getSubjects(String username) {
        return studentSubjectRepositoryPort.findSubjects(username);
    }

    @Override
    public StudentSubjectDocuments getDocuments(String username, Long subjectId) {
        StudentSubjectHeader header = studentSubjectRepositoryPort.findSubjectHeader(username, subjectId)
                .orElseThrow(() -> new UsernameNotFoundException("Student subject not found"));

        List<StudentSubjectDocumentRow> rows = studentSubjectRepositoryPort.findSubjectDocumentRows(username, subjectId);
        return new StudentSubjectDocuments(
                header,
                buildMetrics(rows),
                buildFilters(rows),
                buildUnits(rows)
        );
    }

    private StudentSubjectMetrics buildMetrics(List<StudentSubjectDocumentRow> rows) {
        int totalDocuments = rows.size();
        int reviewedDocuments = (int) rows.stream().filter(StudentSubjectDocumentRow::reviewed).count();
        return new StudentSubjectMetrics(totalDocuments, reviewedDocuments, totalDocuments - reviewedDocuments);
    }

    private List<StudentDocumentTypeFilter> buildFilters(List<StudentSubjectDocumentRow> rows) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("TODOS", rows.size());
        counts.put("PDF", 0);
        counts.put("WORD", 0);
        counts.put("PPT", 0);
        counts.put("IMAGEN", 0);

        for (StudentSubjectDocumentRow row : rows) {
            counts.computeIfPresent(row.fileType(), (ignored, current) -> current + 1);
        }

        return List.of(
                new StudentDocumentTypeFilter("TODOS", "Todos", counts.get("TODOS")),
                new StudentDocumentTypeFilter("PDF", "PDF", counts.get("PDF")),
                new StudentDocumentTypeFilter("WORD", "Word", counts.get("WORD")),
                new StudentDocumentTypeFilter("PPT", "PPT", counts.get("PPT")),
                new StudentDocumentTypeFilter("IMAGEN", "Imagen", counts.get("IMAGEN"))
        );
    }

    private List<StudentSubjectUnit> buildUnits(List<StudentSubjectDocumentRow> rows) {
        Map<Long, List<StudentSubjectDocumentRow>> rowsByUnit = new LinkedHashMap<>();
        for (StudentSubjectDocumentRow row : rows) {
            rowsByUnit.computeIfAbsent(row.unitId(), ignored -> new ArrayList<>()).add(row);
        }

        List<StudentSubjectUnit> units = new ArrayList<>();
        for (List<StudentSubjectDocumentRow> unitRows : rowsByUnit.values()) {
            Map<String, List<StudentSubjectDocumentRow>> rowsByClass = new LinkedHashMap<>();
            for (StudentSubjectDocumentRow row : unitRows) {
                rowsByClass.computeIfAbsent(resolveClassKey(row), ignored -> new ArrayList<>()).add(row);
            }

            List<StudentSubjectClass> classes = new ArrayList<>();
            for (List<StudentSubjectDocumentRow> classRows : rowsByClass.values()) {
                classRows.sort(Comparator
                        .comparing(StudentSubjectDocumentRow::reviewed)
                        .thenComparing(StudentSubjectDocumentRow::publishedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(StudentSubjectDocumentRow::documentId, Comparator.reverseOrder()));

                StudentSubjectDocumentRow firstClassRow = classRows.getFirst();
                classes.add(new StudentSubjectClass(
                        firstClassRow.classId(),
                        resolveClassTitle(firstClassRow),
                        formatDate(firstClassRow.classDate(), firstClassRow.publishedAt()),
                        classRows.stream().anyMatch(row -> !row.reviewed()),
                        classRows.stream().map(this::mapDocument).toList()
                ));
            }

            StudentSubjectDocumentRow firstUnitRow = unitRows.getFirst();
            int reviewedDocuments = (int) unitRows.stream().filter(StudentSubjectDocumentRow::reviewed).count();
            int progressPercent = unitRows.isEmpty() ? 0 : (int) Math.round((reviewedDocuments * 100.0) / unitRows.size());

            units.add(new StudentSubjectUnit(
                    firstUnitRow.unitId(),
                    firstUnitRow.unitNumber(),
                    firstUnitRow.unitName(),
                    classes.size(),
                    unitRows.size(),
                    firstUnitRow.durationWeeks(),
                    progressPercent,
                    classes
            ));
        }

        return units;
    }

    private StudentSubjectDocument mapDocument(StudentSubjectDocumentRow row) {
        String endpoint = "/api/student/documents/" + row.documentId() + "/download";
        return new StudentSubjectDocument(
                row.documentId(),
                row.fileName(),
                row.fileType(),
                row.fileSizeBytes(),
                formatSize(row.fileSizeBytes()),
                resolveMetaLabel(row),
                formatDate(row.classDate(), row.publishedAt()),
                !row.reviewed(),
                row.reviewed(),
                endpoint,
                endpoint
        );
    }

    private String resolveClassKey(StudentSubjectDocumentRow row) {
        return row.classId() == null ? "UNIT-" + row.unitId() : "CLASS-" + row.classId();
    }

    private String resolveClassTitle(StudentSubjectDocumentRow row) {
        return row.classTitle() == null || row.classTitle().isBlank()
                ? "Material general de la unidad"
                : row.classTitle();
    }

    private String resolveMetaLabel(StudentSubjectDocumentRow row) {
        if ("IMAGEN".equals(row.fileType())) {
            return "Imagen";
        }
        return switch (row.fileType()) {
            case "PDF" -> "PDF";
            case "WORD" -> "Documento Word";
            case "PPT" -> "Presentaci\u00F3n";
            default -> row.extension() == null || row.extension().isBlank()
                    ? "Archivo"
                    : row.extension().toUpperCase(Locale.ROOT);
        };
    }

    private String formatDate(LocalDate classDate, LocalDateTime publishedAt) {
        LocalDate value = classDate != null ? classDate : (publishedAt == null ? null : publishedAt.toLocalDate());
        return value == null ? "" : DATE_FORMATTER.format(value);
    }

    private String formatSize(long sizeBytes) {
        if (sizeBytes < 1024) {
            return sizeBytes + " B";
        }
        double sizeKb = sizeBytes / 1024.0;
        if (sizeKb < 1024) {
            return SIZE_FORMAT.format(sizeKb) + " KB";
        }
        double sizeMb = sizeKb / 1024.0;
        if (sizeMb < 1024) {
            return SIZE_FORMAT.format(sizeMb) + " MB";
        }
        return SIZE_FORMAT.format(sizeMb / 1024.0) + " GB";
    }
}
