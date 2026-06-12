package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.StudentAttendanceSummary;
import com.example.authhexagonal.domain.model.StudentDashboard;
import com.example.authhexagonal.domain.model.StudentEnrolledCourse;
import com.example.authhexagonal.domain.model.StudentGradeEvaluation;
import com.example.authhexagonal.domain.model.StudentLatestGrade;
import com.example.authhexagonal.domain.model.StudentScheduleItem;
import com.example.authhexagonal.domain.model.StudentSubjectGradeSummary;
import com.example.authhexagonal.domain.model.StudentUpcomingActivity;
import com.example.authhexagonal.domain.port.out.LoadStudentDashboardPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class StudentDashboardJdbcAdapter implements LoadStudentDashboardPort {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private final JdbcTemplate jdbcTemplate;

    public StudentDashboardJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<StudentDashboard> findByUsername(String username) {
        List<Map<String, Object>> studentRows = jdbcTemplate.queryForList("""
                SELECT
                    a."ID" AS student_id,
                    a."RUN" AS student_run,
                    TRIM(a."NOMBRE" || ' ' || a."APELLIDOS") AS student_name
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                JOIN "ALUMNOS" a ON UPPER(a."RUN") = UPPER(p."RUN")
                WHERE UPPER(u."USUARIO") = UPPER(?)
                   OR UPPER(COALESCE(p."CORREO_ELECTRONICO", '')) = UPPER(?)
                """, username, username);

        if (studentRows.isEmpty()) {
            return Optional.empty();
        }

        Map<String, Object> student = studentRows.getFirst();
        Long studentId = ((Number) student.get("student_id")).longValue();

        List<StudentEnrolledCourse> enrolledCourses = jdbcTemplate.query("""
                SELECT
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    c."CODIGO" AS course_code,
                    m."ESTADO" AS enrollment_status
                FROM "MATRICULAS" m
                JOIN "CURSOS" c ON c."ID" = m."CURSO_ID"
                WHERE m."ALUMNO_ID" = ?
                  AND m."ACTIVA" = TRUE
                ORDER BY c."ANIO_ESCOLAR" DESC, c."NOMBRE"
                """, (rs, rowNum) -> new StudentEnrolledCourse(
                rs.getLong("course_id"),
                rs.getString("course_name"),
                rs.getString("course_code"),
                rs.getString("enrollment_status")
        ), studentId);

        List<StudentScheduleItem> weeklySchedule = jdbcTemplate.query("""
                SELECT DISTINCT
                    bh."DIA_SEMANA" AS day_of_week,
                    bh."HORA_INICIO" AS start_time,
                    bh."HORA_FIN" AS end_time,
                    c."NOMBRE" AS course_name,
                    a."NOMBRE" AS subject_name,
                    COALESCE(hc."SALA", 'Sala por confirmar') AS room,
                    COALESCE(a."COLOR_HEX", '#7c3aed') AS subject_color_hex,
                    CASE bh."DIA_SEMANA"
                        WHEN 'LUNES' THEN 1
                        WHEN 'MARTES' THEN 2
                        WHEN 'MIERCOLES' THEN 3
                        WHEN 'JUEVES' THEN 4
                        WHEN 'VIERNES' THEN 5
                        ELSE 6
                    END AS day_order
                FROM "MATRICULAS" m
                JOIN "CURSOS" c ON c."ID" = m."CURSO_ID"
                JOIN "CARGAS_DOCENTES" cd
                  ON cd."CURSO_ID" = c."ID"
                 AND cd."ACTIVA" = TRUE
                 %s
                JOIN "HORARIOS_CARGAS" hc ON hc."CARGA_DOCENTE_ID" = cd."ID"
                JOIN "BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID" AND bh."ACTIVO" = TRUE
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID" AND a."ACTIVA" = TRUE
                WHERE m."ALUMNO_ID" = ?
                  AND m."ACTIVA" = TRUE
                ORDER BY
                    day_order,
                    bh."HORA_INICIO"
                """.formatted(subjectScopeFilter("cd")), (rs, rowNum) -> new StudentScheduleItem(
                rs.getString("day_of_week"),
                formatTime(rs.getTime("start_time").toLocalTime()),
                formatTime(rs.getTime("end_time").toLocalTime()),
                rs.getString("course_name"),
                rs.getString("subject_name"),
                rs.getString("room"),
                rs.getString("subject_color_hex")
        ), studentId);

        List<StudentLatestGrade> latestGrades = jdbcTemplate.query("""
                SELECT
                    s."NOMBRE" AS subject_name,
                    e."NOMBRE" AS evaluation_name,
                    cal."NOTA" AS score,
                    p."NOMBRE" AS period_name,
                    COALESCE(cal."ACTUALIZADO_EN", cal."CREADO_EN") AS recorded_at
                FROM "CALIFICACIONES" cal
                JOIN "EVALUACIONES" e ON e."ID" = cal."EVALUACION_ID" AND e."ACTIVA" = TRUE
                JOIN "ASIGNATURAS" s ON s."ID" = e."ASIGNATURA_ID" AND s."ACTIVA" = TRUE
                JOIN "PERIODOS_ACADEMICOS" p ON p."ID" = e."PERIODO_ID" AND p."ACTIVO" = TRUE
                JOIN "MATRICULAS" m
                  ON m."ALUMNO_ID" = cal."ALUMNO_ID"
                 AND m."CURSO_ID" = e."CURSO_ID"
                 AND m."ACTIVA" = TRUE
                WHERE cal."ALUMNO_ID" = ?
                  AND cal."ACTIVA" = TRUE
                  AND cal."NOTA" IS NOT NULL
                  %s
                ORDER BY COALESCE(cal."ACTUALIZADO_EN", cal."CREADO_EN") DESC, e."ORDEN" DESC
                LIMIT 6
                """.formatted(subjectScopeFilter("e")), (rs, rowNum) -> new StudentLatestGrade(
                rs.getString("subject_name"),
                rs.getString("evaluation_name"),
                rs.getDouble("score"),
                rs.getString("period_name"),
                formatTimestamp(rs.getTimestamp("recorded_at"))
        ), studentId);

        List<StudentSubjectGradeSummary> gradeSummary = buildGradeSummary(studentId);

        StudentAttendanceSummary attendanceSummary = jdbcTemplate.query("""
                SELECT
                    COUNT(1) FILTER (WHERE ad."ESTADO" = 'PRESENTE') AS present_count,
                    COUNT(1) FILTER (WHERE ad."ESTADO" IN ('ATRASO', 'ATRASADO')) AS late_count,
                    COUNT(1) FILTER (WHERE ad."ESTADO" = 'AUSENTE' OR UPPER(COALESCE(ad."ESTADO", '')) IN ('SUSPENDIDO', 'SUSPENSION', 'SUSPENSIÓN')) AS absent_count,
                    COUNT(1) AS total_count
                FROM "ASISTENCIA_DETALLES" ad
                JOIN "ASISTENCIA_REGISTROS" ar ON ar."ID" = ad."REGISTRO_ID" AND ar."ACTIVO" = TRUE
                WHERE ad."ALUMNO_ID" = ?
                  AND ad."ACTIVO" = TRUE
                """, (rs, rowNum) -> {
            int presentCount = rs.getInt("present_count");
            int lateCount = rs.getInt("late_count");
            int absentCount = rs.getInt("absent_count");
            int totalCount = rs.getInt("total_count");
            int attendancePercentage = totalCount == 0
                    ? 0
                    : (int) Math.round(((presentCount + lateCount) * 100.0) / totalCount);
            return new StudentAttendanceSummary(
                    attendancePercentage,
                    presentCount,
                    lateCount,
                    absentCount,
                    totalCount
            );
        }, studentId).stream().findFirst().orElse(new StudentAttendanceSummary(0, 0, 0, 0, 0));

        List<StudentUpcomingActivity> upcomingActivities = jdbcTemplate.query("""
                SELECT
                    a."ID",
                    a."TITULO",
                    t."NOMBRE" AS activity_type_name,
                    a."FECHA",
                    COALESCE(a."UBICACION", 'Sin ubicacion definida') AS location
                FROM "ACTIVIDADES_ESCOLARES" a
                JOIN "TIPOS_ACTIVIDAD" t ON t."ID" = a."TIPO_ACTIVIDAD_ID"
                WHERE a."ACTIVO" = TRUE
                  AND t."ACTIVO" = TRUE
                  AND COALESCE(a."FECHA_FIN", a."FECHA") >= CURRENT_DATE
                ORDER BY a."FECHA", a."HORA" NULLS LAST, a."TITULO"
                LIMIT 4
                """, (rs, rowNum) -> new StudentUpcomingActivity(
                rs.getLong("ID"),
                rs.getString("TITULO"),
                rs.getString("activity_type_name"),
                formatDate(rs.getDate("FECHA").toLocalDate()),
                rs.getString("location")
        ));

        return Optional.of(new StudentDashboard(
                studentId,
                (String) student.get("student_name"),
                (String) student.get("student_run"),
                enrolledCourses.size(),
                attendanceSummary.percentage(),
                latestGrades.size(),
                upcomingActivities.size(),
                enrolledCourses,
                weeklySchedule,
                latestGrades,
                gradeSummary,
                attendanceSummary,
                upcomingActivities
        ));
    }

    private List<StudentSubjectGradeSummary> buildGradeSummary(Long studentId) {
        Long currentCourseId = findCurrentCourseId(studentId);
        if (currentCourseId == null) {
            return List.of();
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT
                    s."NOMBRE" AS subject_name,
                    e."NOMBRE" AS evaluation_name,
                    e."ORDEN" AS evaluation_order,
                    cal."NOTA" AS score,
                    p."NOMBRE" AS period_name,
                    COALESCE(cal."ACTUALIZADO_EN", cal."CREADO_EN") AS recorded_at
                FROM (
                    %s
                ) course_subjects
                JOIN "ASIGNATURAS" s
                  ON s."ID" = course_subjects."ASIGNATURA_ID"
                 AND s."ACTIVA" = TRUE
                LEFT JOIN "EVALUACIONES" e
                  ON e."CURSO_ID" = course_subjects."CURSO_ID"
                 AND e."ASIGNATURA_ID" = course_subjects."ASIGNATURA_ID"
                 AND e."ACTIVA" = TRUE
                LEFT JOIN "PERIODOS_ACADEMICOS" p
                  ON p."ID" = e."PERIODO_ID"
                 AND p."ACTIVO" = TRUE
                LEFT JOIN "CALIFICACIONES" cal
                  ON cal."EVALUACION_ID" = e."ID"
                 AND cal."ALUMNO_ID" = ?
                 AND cal."ACTIVA" = TRUE
                WHERE course_subjects."CURSO_ID" = ?
                ORDER BY
                    UPPER(s."NOMBRE"),
                    COALESCE(p."ANIO", 0),
                    COALESCE(p."SEMESTRE", 0),
                    COALESCE(e."ORDEN", 0),
                    COALESCE(cal."ACTUALIZADO_EN", cal."CREADO_EN")
                """.formatted(activeCourseSubjectsSubquery()), studentId, currentCourseId);

        Map<String, SubjectGradeSummaryBuilder> builders = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            String subjectName = (String) row.get("subject_name");
            SubjectGradeSummaryBuilder builder = builders.computeIfAbsent(
                    subjectName,
                    ignored -> new SubjectGradeSummaryBuilder(subjectName)
            );
            Double score = row.get("score") == null ? null : ((Number) row.get("score")).doubleValue();
            String evaluationName = (String) row.get("evaluation_name");
            if (evaluationName != null && !evaluationName.isBlank()) {
                builder.evaluations.add(new StudentGradeEvaluation(
                        evaluationName,
                        score == null ? null : round(score),
                        (String) row.get("period_name"),
                        formatTimestamp((Timestamp) row.get("recorded_at"))
                ));
            }
            if (score != null) {
                builder.scores.add(score);
                builder.latestScore = round(score);
            }
        }

        return builders.values().stream()
                .map(SubjectGradeSummaryBuilder::build)
                .sorted(Comparator.comparing(StudentSubjectGradeSummary::subjectName))
                .toList();
    }

    private Long findCurrentCourseId(Long studentId) {
        return jdbcTemplate.query("""
                SELECT c."ID"
                FROM "MATRICULAS" m
                JOIN "CURSOS" c ON c."ID" = m."CURSO_ID"
                WHERE m."ALUMNO_ID" = ?
                  AND m."ACTIVA" = TRUE
                ORDER BY c."ANIO_ESCOLAR" DESC, c."NOMBRE", c."LETRA"
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ID"), studentId).stream().findFirst().orElse(null);
    }

    private String formatTime(LocalTime localTime) {
        return localTime.format(TIME_FORMATTER);
    }

    private String formatDate(LocalDate localDate) {
        return localDate.format(DATE_FORMATTER);
    }

    private String formatTimestamp(Timestamp timestamp) {
        if (timestamp == null) {
            return "";
        }
        return formatDate(timestamp.toLocalDateTime().toLocalDate());
    }

    private Double round(Double value) {
        if (value == null) {
            return null;
        }
        return Math.round(value * 10.0) / 10.0;
    }

    private String subjectScopeFilter(String alias) {
        if (tableExists("ASIGNATURA_CURSOS")) {
            return """
                  AND (
                    NOT EXISTS (
                        SELECT 1
                        FROM "ASIGNATURA_CURSOS" ac_any
                        WHERE ac_any."ASIGNATURA_ID" = %1$s."ASIGNATURA_ID"
                          AND ac_any."ACTIVA" = TRUE
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM "ASIGNATURA_CURSOS" ac_match
                        WHERE ac_match."ASIGNATURA_ID" = %1$s."ASIGNATURA_ID"
                          AND ac_match."CURSO_ID" = %1$s."CURSO_ID"
                          AND ac_match."ACTIVA" = TRUE
                    )
                  )
                """.formatted(alias);
        }

        return "";
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

    private static final class SubjectGradeSummaryBuilder {
        private final String subjectName;
        private final List<StudentGradeEvaluation> evaluations = new ArrayList<>();
        private final List<Double> scores = new ArrayList<>();
        private Double latestScore;

        private SubjectGradeSummaryBuilder(String subjectName) {
            this.subjectName = subjectName;
        }

        private StudentSubjectGradeSummary build() {
            Double average = scores.isEmpty()
                    ? null
                    : Math.round(scores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0) * 10.0) / 10.0;
            return new StudentSubjectGradeSummary(subjectName, average, latestScore, List.copyOf(evaluations));
        }
    }
}
