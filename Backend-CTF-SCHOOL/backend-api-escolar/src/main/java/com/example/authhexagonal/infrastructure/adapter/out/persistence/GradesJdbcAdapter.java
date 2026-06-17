package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.GradeCourseOption;
import com.example.authhexagonal.domain.model.GradeEvaluationCommand;
import com.example.authhexagonal.domain.model.GradeEvaluationHeader;
import com.example.authhexagonal.domain.model.GradePeriodOption;
import com.example.authhexagonal.domain.model.GradeSaveCommand;
import com.example.authhexagonal.domain.model.GradeScoreEntry;
import com.example.authhexagonal.domain.model.GradeStudentInfo;
import com.example.authhexagonal.domain.model.GradeSubjectTab;
import com.example.authhexagonal.domain.model.PedagogicalQuestionBankRow;
import com.example.authhexagonal.domain.port.out.ManageGradesPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class GradesJdbcAdapter implements ManageGradesPort {

    private final JdbcTemplate jdbcTemplate;

    public GradesJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<GradeCourseOption> findCoursesWithGrades() {
        return jdbcTemplate.query("""
                SELECT
                    c."ID",
                    c."NOMBRE" || CASE WHEN COALESCE(c."LETRA", '') <> '' THEN ' ' || c."LETRA" ELSE '' END AS "NOMBRE",
                    c."ANIO_ESCOLAR"
                FROM "CURSOS" c
                WHERE c."ACTIVO" = TRUE
                ORDER BY
                    CASE
                      WHEN UPPER(c."NOMBRE") LIKE '%%PK%%' THEN 0
                      WHEN UPPER(c."NOMBRE") LIKE '%%KINDER%%' THEN 1
                      ELSE 2
                    END,
                    c."ANIO_ESCOLAR" DESC,
                    c."NOMBRE",
                    c."LETRA"
                """, (rs, rowNum) -> new GradeCourseOption(
                rs.getLong("ID"),
                rs.getString("NOMBRE"),
                rs.getInt("ANIO_ESCOLAR")
        ));
    }

    @Override
    public Optional<GradeCourseOption> findCourseById(Long courseId) {
        return jdbcTemplate.query("""
                SELECT
                    "ID",
                    "NOMBRE" || CASE WHEN COALESCE("LETRA", '') <> '' THEN ' ' || "LETRA" ELSE '' END AS "NOMBRE",
                    "ANIO_ESCOLAR"
                FROM "CURSOS"
                WHERE "ID" = ?
                  AND "ACTIVO" = TRUE
                """, (rs, rowNum) -> new GradeCourseOption(
                rs.getLong("ID"),
                rs.getString("NOMBRE"),
                rs.getInt("ANIO_ESCOLAR")
        ), courseId).stream().findFirst();
    }

    @Override
    public List<GradePeriodOption> findActivePeriods() {
        return jdbcTemplate.query("""
                SELECT "ID", "NOMBRE", "ANIO", "SEMESTRE"
                FROM "PERIODOS_ACADEMICOS"
                WHERE "ACTIVO" = TRUE
                ORDER BY "ANIO", "SEMESTRE"
                """, (rs, rowNum) -> new GradePeriodOption(
                rs.getLong("ID"),
                rs.getString("NOMBRE"),
                rs.getInt("ANIO"),
                rs.getInt("SEMESTRE")
        ));
    }

    @Override
    public Optional<GradePeriodOption> findPeriodById(Long periodId) {
        return jdbcTemplate.query("""
                SELECT "ID", "NOMBRE", "ANIO", "SEMESTRE"
                FROM "PERIODOS_ACADEMICOS"
                WHERE "ID" = ?
                  AND "ACTIVO" = TRUE
                """, (rs, rowNum) -> new GradePeriodOption(
                rs.getLong("ID"),
                rs.getString("NOMBRE"),
                rs.getInt("ANIO"),
                rs.getInt("SEMESTRE")
        ), periodId).stream().findFirst();
    }

    @Override
    public List<GradeSubjectTab> findSubjectsByCourseAndPeriod(Long courseId, Long periodId) {
        return jdbcTemplate.query("""
                SELECT DISTINCT
                  s."ID",
                  s."NOMBRE",
                  s."COLOR_HEX",
                  'NUMERICA' AS "TIPO_EVALUACION"
                FROM (
                  %s
                ) course_subjects
                JOIN "ASIGNATURAS" s ON s."ID" = course_subjects."ASIGNATURA_ID"
                LEFT JOIN "EVALUACIONES" e
                  ON e."CURSO_ID" = course_subjects."CURSO_ID"
                 AND e."ASIGNATURA_ID" = course_subjects."ASIGNATURA_ID"
                 AND e."PERIODO_ID" = ?
                 AND e."ACTIVA" = TRUE
                WHERE course_subjects."CURSO_ID" = ?
                  AND s."ACTIVA" = TRUE
                ORDER BY s."NOMBRE"
                """.formatted(activeCourseSubjectsSubquery()), (rs, rowNum) -> new GradeSubjectTab(
                rs.getLong("ID"),
                rs.getString("NOMBRE"),
                rs.getString("COLOR_HEX"),
                rs.getString("TIPO_EVALUACION")
        ), periodId, courseId);
    }

    @Override
    public List<GradeEvaluationHeader> findEvaluations(Long courseId, Long periodId, Long subjectId) {
        return jdbcTemplate.query("""
                SELECT "ID", "CODIGO", "NOMBRE", "ORDEN", "PONDERACION", "FECHA_EVALUACION",
                       COALESCE(NULLIF(TRIM("TIPO_REGISTRO"), ''), 'SUMATIVA') AS "TIPO_REGISTRO"
                FROM "EVALUACIONES"
                WHERE "CURSO_ID" = ?
                  AND "PERIODO_ID" = ?
                  AND "ASIGNATURA_ID" = ?
                  AND "ACTIVA" = TRUE
                ORDER BY "ORDEN"
        """, (rs, rowNum) -> new GradeEvaluationHeader(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getInt("ORDEN"),
                rs.getObject("PONDERACION") == null ? null : rs.getDouble("PONDERACION"),
                rs.getDate("FECHA_EVALUACION") == null ? null : rs.getDate("FECHA_EVALUACION").toLocalDate().toString(),
                rs.getString("TIPO_REGISTRO")
        ), courseId, periodId, subjectId);
    }

    @Override
    public List<GradeStudentInfo> findStudentsByCourse(Long courseId) {
        return jdbcTemplate.query("""
                SELECT a."ID", a."RUN", TRIM(a."NOMBRE" || ' ' || a."APELLIDOS") AS full_name
                FROM "MATRICULAS" m
                JOIN "ALUMNOS" a ON a."ID" = m."ALUMNO_ID"
                WHERE m."CURSO_ID" = ?
                  AND m."ACTIVA" = TRUE
                ORDER BY a."NOMBRE", a."APELLIDOS"
                """, (rs, rowNum) -> new GradeStudentInfo(
                rs.getLong("ID"),
                rs.getString("RUN"),
                rs.getString("full_name")
        ), courseId);
    }

    @Override
    public List<GradeScoreEntry> findScores(Long courseId, Long periodId, Long subjectId) {
        return jdbcTemplate.query("""
                SELECT cal."ALUMNO_ID", cal."EVALUACION_ID", cal."NOTA", cal."VALOR_CONCEPTUAL", cal."PORCENTAJE_LOGRO"
                FROM "CALIFICACIONES" cal
                JOIN "EVALUACIONES" e ON e."ID" = cal."EVALUACION_ID"
                WHERE e."CURSO_ID" = ?
                  AND e."PERIODO_ID" = ?
                  AND e."ASIGNATURA_ID" = ?
                  AND e."ACTIVA" = TRUE
                  AND cal."ACTIVA" = TRUE
                ORDER BY cal."ALUMNO_ID", e."ORDEN"
                """, (rs, rowNum) -> {
            Double score = rs.getObject("NOTA") == null ? null : rs.getDouble("NOTA");
            return new GradeScoreEntry(
                    rs.getLong("ALUMNO_ID"),
                    rs.getLong("EVALUACION_ID"),
                    score,
                    rs.getString("VALOR_CONCEPTUAL"),
                    rs.getObject("PORCENTAJE_LOGRO") == null ? null : rs.getDouble("PORCENTAJE_LOGRO")
            );
        }, courseId, periodId, subjectId);
    }

    @Override
    public void saveScores(List<GradeSaveCommand> commands) {
        for (GradeSaveCommand command : commands) {
            jdbcTemplate.update("""
                    INSERT INTO "CALIFICACIONES" (
                        "EVALUACION_ID",
                        "ALUMNO_ID",
                        "NOTA",
                        "VALOR_CONCEPTUAL",
                        "PORCENTAJE_LOGRO",
                        "OBSERVACION",
                        "ACTIVA",
                        "CREADO_EN",
                        "ACTUALIZADO_EN"
                    )
                    VALUES (?, ?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT ("EVALUACION_ID", "ALUMNO_ID")
                    DO UPDATE SET
                        "NOTA" = EXCLUDED."NOTA",
                        "VALOR_CONCEPTUAL" = EXCLUDED."VALOR_CONCEPTUAL",
                        "PORCENTAJE_LOGRO" = EXCLUDED."PORCENTAJE_LOGRO",
                        "OBSERVACION" = EXCLUDED."OBSERVACION",
                        "ACTIVA" = TRUE,
                        "ACTUALIZADO_EN" = CURRENT_TIMESTAMP
                    """,
                    command.evaluationId(),
                    command.studentId(),
                    command.score(),
                    command.conceptCode(),
                    command.percentage(),
                    command.score() == null && command.conceptCode() == null && command.percentage() == null ? "Pendiente de registrar" : null
            );
        }
    }

    @Override
    public void createEvaluation(GradeEvaluationCommand command, int order) {
        syncSequence("EVALUACIONES", "ID");
        jdbcTemplate.update("""
                INSERT INTO "EVALUACIONES" (
                    "CURSO_ID",
                    "PERIODO_ID",
                    "ASIGNATURA_ID",
                    "CODIGO",
                    "NOMBRE",
                    "ORDEN",
                    "PONDERACION",
                    "FECHA_EVALUACION",
                    "TIPO_REGISTRO",
                    "ACTIVA"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                """,
                command.courseId(),
                command.periodId(),
                command.subjectId(),
                command.code(),
                command.name(),
                order,
                command.weight(),
                command.evaluationDate(),
                command.registrationType()
        );
    }

    @Override
    public boolean updateEvaluation(Long evaluationId, GradeEvaluationCommand command) {
        return jdbcTemplate.update("""
                UPDATE "EVALUACIONES"
                SET "CODIGO" = ?,
                    "NOMBRE" = ?,
                    "PONDERACION" = ?,
                    "FECHA_EVALUACION" = ?,
                    "TIPO_REGISTRO" = ?
                WHERE "ID" = ?
                  AND "CURSO_ID" = ?
                  AND "PERIODO_ID" = ?
                  AND "ASIGNATURA_ID" = ?
                  AND "ACTIVA" = TRUE
                """,
                command.code(),
                command.name(),
                command.weight(),
                command.evaluationDate(),
                command.registrationType(),
                evaluationId,
                command.courseId(),
                command.periodId(),
                command.subjectId()
        ) > 0;
    }

    @Override
    public boolean deactivateEvaluation(Long evaluationId, Long courseId, Long periodId, Long subjectId) {
        int updated = jdbcTemplate.update("""
                UPDATE "EVALUACIONES"
                SET "ACTIVA" = FALSE
                WHERE "ID" = ?
                  AND "CURSO_ID" = ?
                  AND "PERIODO_ID" = ?
                  AND "ASIGNATURA_ID" = ?
                  AND "ACTIVA" = TRUE
                """,
                evaluationId,
                courseId,
                periodId,
                subjectId
        );

        if (updated > 0) {
            jdbcTemplate.update("""
                    UPDATE "CALIFICACIONES"
                    SET "ACTIVA" = FALSE,
                        "ACTUALIZADO_EN" = CURRENT_TIMESTAMP
                    WHERE "EVALUACION_ID" = ?
                    """,
                    evaluationId
            );
        }

        return updated > 0;
    }

    @Override
    public List<StudentSubjectAverageRow> findStudentSubjectAverages(Long courseId, Long periodId) {
        return jdbcTemplate.query("""
                SELECT
                  a."ID" AS student_id,
                  a."RUN",
                  TRIM(a."NOMBRE" || ' ' || a."APELLIDOS") AS full_name,
                  s."ID" AS subject_id,
                  s."NOMBRE" AS subject_name,
                  s."COLOR_HEX",
                  'NUMERICA' AS evaluation_type,
                  ROUND(AVG(CASE
                      WHEN COALESCE(NULLIF(TRIM(e."TIPO_REGISTRO"), ''), 'SUMATIVA') = 'DIAGNOSTICA' THEN NULL
                      ELSE cal."NOTA"
                  END)::numeric, 1) AS average_score,
                  NULL AS concept_summary_code
                FROM "MATRICULAS" m
                JOIN "ALUMNOS" a ON a."ID" = m."ALUMNO_ID"
                JOIN (
                  %s
                ) course_subjects ON course_subjects."CURSO_ID" = m."CURSO_ID"
                JOIN "ASIGNATURAS" s ON s."ID" = course_subjects."ASIGNATURA_ID" AND s."ACTIVA" = TRUE
                LEFT JOIN "EVALUACIONES" e
                  ON e."CURSO_ID" = m."CURSO_ID"
                 AND e."ASIGNATURA_ID" = s."ID"
                 AND e."PERIODO_ID" = ?
                 AND e."ACTIVA" = TRUE
                LEFT JOIN "CALIFICACIONES" cal
                  ON cal."EVALUACION_ID" = e."ID"
                 AND cal."ALUMNO_ID" = a."ID"
                 AND cal."ACTIVA" = TRUE
                WHERE m."CURSO_ID" = ?
                  AND m."ACTIVA" = TRUE
                GROUP BY a."ID", a."RUN", a."NOMBRE", a."APELLIDOS", s."ID", s."NOMBRE", s."COLOR_HEX"
                ORDER BY a."NOMBRE", a."APELLIDOS", s."NOMBRE"
                """.formatted(activeCourseSubjectsSubquery()), (rs, rowNum) -> new StudentSubjectAverageRow(
                rs.getLong("student_id"),
                rs.getString("RUN"),
                rs.getString("full_name"),
                rs.getLong("subject_id"),
                rs.getString("subject_name"),
                rs.getString("COLOR_HEX"),
                rs.getObject("average_score") == null ? null : rs.getDouble("average_score"),
                rs.getString("evaluation_type"),
                rs.getString("concept_summary_code")
        ), periodId, courseId);
    }

    @Override
    public List<PedagogicalQuestionBankRow> findPedagogicalQuestionBank(String levelCode) {
        if (!tableExists("PEDAGOGICAL_QUESTION_BANK")) {
            return List.of();
        }
        return jdbcTemplate.query("""
                SELECT "ID", "AREA_KEY", "LEVEL_CODE", "QUESTION_KIND", "QUESTION_TEXT", "SORT_ORDER"
                FROM "PEDAGOGICAL_QUESTION_BANK"
                WHERE "ACTIVO" = TRUE
                  AND "LEVEL_CODE" IN ('GENERAL', ?)
                ORDER BY
                    CASE "AREA_KEY"
                        WHEN 'personal-social' THEN 1
                        WHEN 'lenguaje-verbal' THEN 2
                        WHEN 'area-motriz' THEN 3
                        WHEN 'area-cognitiva' THEN 4
                        WHEN 'actitudes-aprendizaje' THEN 5
                        WHEN 'family-recommendations' THEN 6
                        ELSE 99
                    END,
                    "SORT_ORDER",
                    "ID"
                """, (rs, rowNum) -> new PedagogicalQuestionBankRow(
                rs.getLong("ID"),
                rs.getString("AREA_KEY"),
                rs.getString("LEVEL_CODE"),
                rs.getString("QUESTION_KIND"),
                rs.getString("QUESTION_TEXT"),
                rs.getInt("SORT_ORDER")
        ), levelCode);
    }

    @Override
    public Optional<String> findPedagogicalReportContent(Long courseId, Long periodId, Long studentId) {
        return jdbcTemplate.query("""
                SELECT "CONTENIDO_JSON"::text AS content_json
                FROM "INFORMES_PEDAGOGICOS"
                WHERE "CURSO_ID" = ?
                  AND "PERIODO_ID" = ?
                  AND "ALUMNO_ID" = ?
                  AND "ACTIVO" = TRUE
                """, (rs, rowNum) -> rs.getString("content_json"), courseId, periodId, studentId).stream().findFirst();
    }

    @Override
    public void savePedagogicalReportContent(Long courseId, Long periodId, Long studentId, String contentJson) {
        syncSequence("INFORMES_PEDAGOGICOS", "ID");
        jdbcTemplate.update("""
                INSERT INTO "INFORMES_PEDAGOGICOS" (
                    "CURSO_ID",
                    "PERIODO_ID",
                    "ALUMNO_ID",
                    "CONTENIDO_JSON",
                    "ACTIVO",
                    "CREADO_EN",
                    "ACTUALIZADO_EN"
                )
                VALUES (?, ?, ?, CAST(? AS jsonb), TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT ("CURSO_ID", "PERIODO_ID", "ALUMNO_ID")
                DO UPDATE SET
                    "CONTENIDO_JSON" = CAST(EXCLUDED."CONTENIDO_JSON" AS jsonb),
                    "ACTIVO" = TRUE,
                    "ACTUALIZADO_EN" = CURRENT_TIMESTAMP
                """,
                courseId,
                periodId,
                studentId,
                contentJson
        );
    }

    private String activeCourseSubjectsSubquery() {
        if (tableExists("ASIGNATURA_CURSOS")) {
            return """
                    SELECT DISTINCT ca."CURSO_ID", ca."ASIGNATURA_ID"
                    FROM "CURSO_ASIGNATURAS" ca
                    WHERE ca."ACTIVA" = TRUE
                      AND (
                        NOT EXISTS (
                            SELECT 1
                            FROM "ASIGNATURA_CURSOS" ac_any
                            WHERE ac_any."ASIGNATURA_ID" = ca."ASIGNATURA_ID"
                              AND ac_any."ACTIVA" = TRUE
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM "ASIGNATURA_CURSOS" ac_match
                            WHERE ac_match."ASIGNATURA_ID" = ca."ASIGNATURA_ID"
                              AND ac_match."CURSO_ID" = ca."CURSO_ID"
                              AND ac_match."ACTIVA" = TRUE
                        )
                      )
                    UNION
                    SELECT DISTINCT cd."CURSO_ID", cd."ASIGNATURA_ID"
                    FROM "CARGAS_DOCENTES" cd
                    WHERE cd."ACTIVA" = TRUE
                      AND (
                        NOT EXISTS (
                            SELECT 1
                            FROM "ASIGNATURA_CURSOS" ac_any
                            WHERE ac_any."ASIGNATURA_ID" = cd."ASIGNATURA_ID"
                              AND ac_any."ACTIVA" = TRUE
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM "ASIGNATURA_CURSOS" ac_match
                            WHERE ac_match."ASIGNATURA_ID" = cd."ASIGNATURA_ID"
                              AND ac_match."CURSO_ID" = cd."CURSO_ID"
                              AND ac_match."ACTIVA" = TRUE
                        )
                      )
                    """;
        }

        return """
                SELECT DISTINCT ca."CURSO_ID", ca."ASIGNATURA_ID"
                FROM "CURSO_ASIGNATURAS" ca
                WHERE ca."ACTIVA" = TRUE
                UNION
                SELECT DISTINCT cd."CURSO_ID", cd."ASIGNATURA_ID"
                FROM "CARGAS_DOCENTES" cd
                WHERE cd."ACTIVA" = TRUE
                """;
    }

    private boolean tableExists(String tableName) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND UPPER(table_name) = UPPER(?)
                )
                """, Boolean.class, tableName);
        return Boolean.TRUE.equals(exists);
    }

    private void syncSequence(String tableName, String columnName) {
        jdbcTemplate.execute("""
                SELECT setval(
                    pg_get_serial_sequence('"%s"', '%s'),
                    COALESCE((SELECT MAX("%s") FROM "%s"), 0) + 1,
                    false
                )
                """.formatted(tableName, columnName, columnName, tableName));
    }
}
