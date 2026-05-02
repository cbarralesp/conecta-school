package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.CurriculumGrade;
import com.example.authhexagonal.domain.model.CurriculumObjective;
import com.example.authhexagonal.domain.model.CurriculumSubject;
import com.example.authhexagonal.domain.port.out.CurriculumRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public class CurriculumJdbcAdapter implements CurriculumRepository {

    private static final Map<String, List<String>> SUBJECT_ALIASES = Map.of(
            "artes visuales", List.of("artes visuales", "artes"),
            "ciencias naturales", List.of("ciencias naturales", "ciencias"),
            "educacion fisica y salud", List.of("educacion fisica y salud", "educacion fisica"),
            "historia, geografia y ciencias sociales", List.of(
                    "historia, geografia y ciencias sociales",
                    "historia",
                    "historia geografia y ciencias sociales"
            ),
            "idioma extranjero ingles", List.of("idioma extranjero ingles", "ingles"),
            "lenguaje y comunicacion", List.of("lenguaje y comunicacion", "lenguaje"),
            "matematica", List.of("matematica"),
            "musica", List.of("musica"),
            "orientacion", List.of("orientacion"),
            "tecnologia", List.of("tecnologia")
    );

    private final JdbcTemplate jdbcTemplate;

    public CurriculumJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<CurriculumSubject> findAllSubjects() {
        return jdbcTemplate.query("""
                SELECT id, slug, nombre, total_grados
                FROM curriculum_subjects
                ORDER BY nombre ASC
                """, (rs, rowNum) -> mapSubject(rs));
    }

    @Override
    public List<CurriculumGrade> findGradesBySubjectId(UUID subjectId) {
        return jdbcTemplate.query("""
                SELECT id, subject_id, grado, label, total_objetivos
                FROM curriculum_grades
                WHERE subject_id = ?
                ORDER BY CAST(grado AS INTEGER), label
                """, (rs, rowNum) -> mapGrade(rs), subjectId);
    }

    @Override
    public List<CurriculumObjective> findObjectivesByGradeId(UUID gradeId) {
        List<CurriculumObjectiveRow> rows = jdbcTemplate.query("""
                SELECT id, grade_id, codigo, tipo, COALESCE(eje, '') AS eje, descripcion
                FROM curriculum_objectives
                WHERE grade_id = ?
                ORDER BY
                    CASE tipo
                        WHEN 'conocimiento' THEN 1
                        WHEN 'habilidad' THEN 2
                        ELSE 3
                    END,
                    codigo
                """, (rs, rowNum) -> mapObjectiveRow(rs), gradeId);
        return enrichWithSubItems(rows);
    }

    @Override
    public List<CurriculumObjective> searchObjectives(UUID subjectId, String grado, String eje, String tipo) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    o.id,
                    o.grade_id,
                    o.codigo,
                    o.tipo,
                    COALESCE(o.eje, '') AS eje,
                    o.descripcion
                FROM curriculum_objectives o
                JOIN curriculum_grades g ON g.id = o.grade_id
                JOIN curriculum_subjects s ON s.id = g.subject_id
                WHERE 1 = 1
                """);

        List<Object> args = new ArrayList<>();

        if (subjectId != null) {
            sql.append(" AND g.subject_id = ?");
            args.add(subjectId);
        }
        if (grado != null && !grado.isBlank()) {
            sql.append(" AND g.grado = ?");
            args.add(grado.trim());
        }
        if (eje != null && !eje.isBlank()) {
            sql.append(" AND UPPER(COALESCE(o.eje, '')) = UPPER(?)");
            args.add(eje.trim());
        }
        if (tipo != null && !tipo.isBlank()) {
            sql.append(" AND UPPER(o.tipo) = UPPER(?)");
            args.add(tipo.trim());
        }

        sql.append("""
                 ORDER BY
                    s.nombre,
                    CAST(g.grado AS INTEGER),
                    CASE o.tipo
                        WHEN 'conocimiento' THEN 1
                        WHEN 'habilidad' THEN 2
                        ELSE 3
                    END,
                    o.codigo
                """);

        List<CurriculumObjectiveRow> rows = jdbcTemplate.query(
                sql.toString(),
                (rs, rowNum) -> mapObjectiveRow(rs),
                args.toArray()
        );
        return enrichWithSubItems(rows);
    }

    @Override
    public List<CurriculumObjective> findObjectivesByContext(String subjectName, String courseName) {
        if (subjectName == null || subjectName.isBlank() || courseName == null || courseName.isBlank()) {
            return List.of();
        }

        CurriculumSubject matchedSubject = matchSubject(findAllSubjects(), subjectName);
        if (matchedSubject == null) {
            return List.of();
        }

        List<String> gradeCodes = extractGradeCodes(courseName);
        if (gradeCodes.isEmpty()) {
            return List.of();
        }

        List<CurriculumGrade> matchedGrades = findGradesBySubjectId(matchedSubject.id()).stream()
                .filter(grade -> gradeCodes.contains(grade.grado()))
                .toList();

        if (matchedGrades.isEmpty()) {
            return List.of();
        }

        Map<UUID, CurriculumObjective> mergedObjectives = new LinkedHashMap<>();
        for (CurriculumGrade grade : matchedGrades) {
            for (CurriculumObjective objective : findObjectivesByGradeId(grade.id())) {
                mergedObjectives.putIfAbsent(objective.id(), objective);
            }
        }

        return mergedObjectives.values().stream()
                .sorted((left, right) -> {
                    int ejeCompare = String.valueOf(left.eje()).compareToIgnoreCase(String.valueOf(right.eje()));
                    if (ejeCompare != 0) {
                        return ejeCompare;
                    }
                    int typeCompare = left.tipo().compareToIgnoreCase(right.tipo());
                    if (typeCompare != 0) {
                        return typeCompare;
                    }
                    return left.codigo().compareToIgnoreCase(right.codigo());
                })
                .toList();
    }

    private CurriculumSubject mapSubject(ResultSet rs) throws SQLException {
        return new CurriculumSubject(
                rs.getObject("id", UUID.class),
                rs.getString("slug"),
                rs.getString("nombre"),
                rs.getInt("total_grados")
        );
    }

    private CurriculumGrade mapGrade(ResultSet rs) throws SQLException {
        return new CurriculumGrade(
                rs.getObject("id", UUID.class),
                rs.getObject("subject_id", UUID.class),
                rs.getString("grado"),
                rs.getString("label"),
                rs.getInt("total_objetivos")
        );
    }

    private CurriculumObjectiveRow mapObjectiveRow(ResultSet rs) throws SQLException {
        return new CurriculumObjectiveRow(
                rs.getObject("id", UUID.class),
                rs.getObject("grade_id", UUID.class),
                rs.getString("codigo"),
                rs.getString("tipo"),
                rs.getString("eje"),
                rs.getString("descripcion")
        );
    }

    private List<CurriculumObjective> enrichWithSubItems(List<CurriculumObjectiveRow> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }

        List<UUID> objectiveIds = rows.stream()
                .map(CurriculumObjectiveRow::id)
                .toList();

        String placeholders = String.join(", ", java.util.Collections.nCopies(objectiveIds.size(), "?"));
        Map<UUID, List<String>> subItemsByObjective = new LinkedHashMap<>();
        jdbcTemplate.query(
                """
                SELECT objective_id, descripcion
                FROM curriculum_objective_items
                WHERE objective_id IN (%s)
                ORDER BY objective_id, orden
                """.formatted(placeholders),
                (rs) -> {
                    UUID objectiveId = rs.getObject("objective_id", UUID.class);
                    subItemsByObjective.computeIfAbsent(objectiveId, ignored -> new ArrayList<>())
                            .add(rs.getString("descripcion"));
                },
                objectiveIds.toArray()
        );

        return rows.stream()
                .map(row -> new CurriculumObjective(
                        row.id(),
                        row.gradeId(),
                        row.codigo(),
                        row.tipo(),
                        row.eje(),
                        row.descripcion(),
                        subItemsByObjective.getOrDefault(row.id(), List.of())
                ))
                .toList();
    }

    private record CurriculumObjectiveRow(
            UUID id,
            UUID gradeId,
            String codigo,
            String tipo,
            String eje,
            String descripcion
    ) {
    }

    private CurriculumSubject matchSubject(List<CurriculumSubject> subjects, String planningSubjectName) {
        String normalizedPlanningName = normalize(planningSubjectName);

        for (CurriculumSubject subject : subjects) {
            String normalizedOfficialName = normalize(subject.nombre());
            if (normalizedOfficialName.equals(normalizedPlanningName)) {
                return subject;
            }

            List<String> aliases = SUBJECT_ALIASES.getOrDefault(normalizedOfficialName, List.of());
            if (aliases.contains(normalizedPlanningName)) {
                return subject;
            }
        }

        return null;
    }

    private List<String> extractGradeCodes(String courseName) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\d+").matcher(courseName);
        Set<String> gradeCodes = new LinkedHashSet<>();
        while (matcher.find()) {
            gradeCodes.add(matcher.group());
        }
        return new ArrayList<>(gradeCodes);
    }

    private String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("\\s+", " ")
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}
