package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.application.support.AcademicSemesterResolver;
import com.example.authhexagonal.domain.model.TeacherStatistics;
import com.example.authhexagonal.domain.port.out.LoadTeacherStatisticsPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.Month;
import java.time.Year;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class TeacherStatisticsJdbcAdapter implements LoadTeacherStatisticsPort {

    private static final Locale SPANISH = Locale.forLanguageTag("es-CL");

    private final JdbcTemplate jdbcTemplate;

    public TeacherStatisticsJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public TeacherStatistics findByUsername(String username, Integer semester) {
        UserContext user = loadUserContext(username);
        int currentYear = LocalDate.now().getYear();
        int resolvedSemester = AcademicSemesterResolver.resolveProvidedOrCurrent(semester);
        SemesterWindow currentWindow = SemesterWindow.of(currentYear, resolvedSemester);
        SemesterWindow previousWindow = currentWindow.previous();
        PeriodContext currentPeriod = loadPeriod(currentWindow.year(), currentWindow.semester());
        PeriodContext previousPeriod = loadPeriod(previousWindow.year(), previousWindow.semester());

        List<CourseContext> courses = loadAccessibleCourses(user, currentYear);
        if (courses.isEmpty()) {
            courses = loadAccessibleCourses(user, null);
        }

        Map<String, List<TeacherStatistics.Course>> groupedCourses = new LinkedHashMap<>();
        groupedCourses.put("parvularia", new ArrayList<>());
        groupedCourses.put("basica", new ArrayList<>());
        groupedCourses.put("media", new ArrayList<>());

        for (CourseContext course : courses) {
            groupedCourses.computeIfAbsent(course.levelId(), ignored -> new ArrayList<>())
                    .add(buildCourse(course, currentWindow, previousWindow, currentPeriod, previousPeriod));
        }

        List<TeacherStatistics.Level> levels = groupedCourses.entrySet().stream()
                .filter(entry -> !entry.getValue().isEmpty())
                .map(entry -> new TeacherStatistics.Level(entry.getKey(), List.copyOf(entry.getValue())))
                .toList();

        return new TeacherStatistics(
                currentPeriod.name(),
                currentWindow.chartLabels(),
                levels
        );
    }

    private UserContext loadUserContext(String username) {
        return jdbcTemplate.query("""
                SELECT
                    COALESCE(pr."ID", 0) AS teacher_id,
                    COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
                FROM "USUARIOS" u
                JOIN "PERSONAS" pe ON pe."ID" = u."PERSONA_ID"
                LEFT JOIN "PROFESORES" pr
                  ON pr."PERSONA_ID" = pe."ID"
                 AND pr."ACTIVO" = TRUE
                LEFT JOIN "ADMIN_USER_SETTINGS" aus
                  ON aus."USUARIO_ID" = u."ID"
                LEFT JOIN "ADMIN_ROLES" ar
                  ON ar."ID" = aus."ROL_ID"
                WHERE UPPER(u."USUARIO") = UPPER(?)
                  AND u."ACTIVO" = TRUE
                ORDER BY u."ID"
                LIMIT 1
                """, (rs, rowNum) -> new UserContext(
                rs.getLong("teacher_id"),
                isAdministrativeRole(rs.getString("role_code"))
        ), username).stream().findFirst()
                .orElseThrow(() -> new UsernameNotFoundException("Teacher statistics not found"));
    }

    private boolean isAdministrativeRole(String roleCode) {
        String normalized = safeText(roleCode).toUpperCase(Locale.ROOT);
        return "ADMIN".equals(normalized) || "SUPERADMIN".equals(normalized);
    }

    private PeriodContext loadPeriod(int year, int semester) {
        Optional<PeriodContext> period = jdbcTemplate.query("""
                SELECT "ID", "NOMBRE"
                FROM "PERIODOS_ACADEMICOS"
                WHERE "ACTIVO" = TRUE
                  AND "ANIO" = ?
                  AND "SEMESTRE" = ?
                ORDER BY "ID"
                LIMIT 1
                """, (rs, rowNum) -> new PeriodContext(
                rs.getLong("ID"),
                rs.getString("NOMBRE")
        ), year, semester).stream().findFirst();

        return period.orElseGet(() -> new PeriodContext(
                null,
                "Semestre " + semester + " " + year
        ));
    }

    private List<CourseContext> loadAccessibleCourses(UserContext user, Integer schoolYear) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    c."ID" AS course_id,
                    CASE
                        WHEN COALESCE(BTRIM(c."LETRA"), '') = '' THEN c."NOMBRE"
                        WHEN RIGHT(BTRIM(c."NOMBRE"), LENGTH(BTRIM(c."LETRA"))) = BTRIM(c."LETRA") THEN c."NOMBRE"
                        ELSE c."NOMBRE" || ' ' || c."LETRA"
                    END AS display_name,
                    COALESCE(cg."NOMBRE", c."NIVEL", c."NOMBRE") AS grade_name,
                    COALESCE(
                        (
                            SELECT TRIM(COALESCE(tp."NOMBRES", '') || ' ' || COALESCE(tp."APELLIDOS", ''))
                            FROM "CURSO_DOCENTES" cdj
                            JOIN "PROFESORES" prj ON prj."ID" = cdj."PROFESOR_ID"
                            JOIN "PERSONAS" tp ON tp."ID" = prj."PERSONA_ID"
                            WHERE cdj."CURSO_ID" = c."ID"
                            ORDER BY cdj."ID"
                            LIMIT 1
                        ),
                        (
                            SELECT TRIM(COALESCE(tp."NOMBRES", '') || ' ' || COALESCE(tp."APELLIDOS", ''))
                            FROM "CARGAS_DOCENTES" cdl
                            JOIN "PROFESORES" prl ON prl."ID" = cdl."PROFESOR_ID"
                            JOIN "PERSONAS" tp ON tp."ID" = prl."PERSONA_ID"
                            WHERE cdl."CURSO_ID" = c."ID"
                              AND cdl."ACTIVA" = TRUE
                            ORDER BY cdl."ES_PROFESOR_JEFE" DESC, cdl."ID"
                            LIMIT 1
                        ),
                        'Sin docente asignado'
                    ) AS teacher_name,
                    COALESCE((
                        SELECT COUNT(1)
                        FROM "MATRICULAS" m
                        WHERE m."CURSO_ID" = c."ID"
                          AND m."ACTIVA" = TRUE
                    ), 0) AS student_count
                FROM "CURSOS" c
                LEFT JOIN "CURSO_GRADOS" cg ON cg."ID" = c."GRADO_ID"
                WHERE c."ACTIVO" = TRUE
                """);

        List<Object> args = new ArrayList<>();
        if (schoolYear != null) {
            sql.append(" AND c.\"ANIO_ESCOLAR\" = ?");
            args.add(schoolYear);
        }

        if (!user.isAdmin()) {
            sql.append("""
                     AND (
                        EXISTS (
                            SELECT 1
                            FROM "CURSO_DOCENTES" cdj
                            WHERE cdj."CURSO_ID" = c."ID"
                              AND cdj."PROFESOR_ID" = ?
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM "CARGAS_DOCENTES" cdl
                            WHERE cdl."CURSO_ID" = c."ID"
                              AND cdl."PROFESOR_ID" = ?
                              AND cdl."ACTIVA" = TRUE
                        )
                    )
                    """);
            args.add(user.teacherId());
            args.add(user.teacherId());
        }

        sql.append(" ORDER BY c.\"NOMBRE\", c.\"LETRA\", c.\"ID\"");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new CourseContext(
                rs.getLong("course_id"),
                rs.getString("display_name"),
                resolveLevelId(rs.getString("grade_name"), rs.getString("display_name")),
                safeText(rs.getString("teacher_name")),
                rs.getInt("student_count")
        ), args.toArray());
    }

    private TeacherStatistics.Course buildCourse(
            CourseContext course,
            SemesterWindow currentWindow,
            SemesterWindow previousWindow,
            PeriodContext currentPeriod,
            PeriodContext previousPeriod
    ) {
        AttendanceMetrics currentAttendance = loadAttendanceMetrics(course.id(), currentWindow);
        AttendanceMetrics previousAttendance = loadAttendanceMetrics(course.id(), previousWindow);
        double currentAverageGrade = loadAverageGrade(course.id(), currentPeriod.id());
        double previousAverageGrade = loadAverageGrade(course.id(), previousPeriod.id());
        PlanningMetrics currentPlanning = loadPlanningMetrics(course.id(), currentWindow);
        PlanningMetrics previousPlanning = loadPlanningMetrics(course.id(), previousWindow);
        int currentAnnotations = loadAnnotationCount(course.id(), currentWindow);
        int previousAnnotations = loadAnnotationCount(course.id(), previousWindow);

        return new TeacherStatistics.Course(
                course.id(),
                course.name(),
                course.students(),
                course.teacher(),
                currentAttendance.averageAttendance(),
                currentAverageGrade,
                currentPlanning.progressPercent(),
                currentAnnotations,
                currentAnnotations - previousAnnotations,
                currentAttendance.averageAttendance() - previousAttendance.averageAttendance(),
                roundOneDecimal(currentAverageGrade - previousAverageGrade),
                currentPlanning.progressPercent() - previousPlanning.progressPercent(),
                List.of(
                        new TeacherStatistics.DistributionItem("Presentes", currentAttendance.presentPercent(), "green"),
                        new TeacherStatistics.DistributionItem("Ausentes", currentAttendance.absentPercent(), "blue"),
                        new TeacherStatistics.DistributionItem("Atrasos", currentAttendance.latePercent(), "cyan")
                ),
                loadAttendanceSeries(course.id(), currentWindow),
                loadGradeSeries(course.id(), currentPeriod.id(), currentWindow.monthNumbers()),
                loadPlanningSeries(course.id(), currentWindow),
                new TeacherStatistics.PlanningSummary(
                        currentPlanning.completedCount(),
                        currentPlanning.inProgressCount(),
                        currentPlanning.pendingCount()
                ),
                loadAnnotationSeries(course.id(), currentWindow),
                loadEvaluationCount(course.id(), currentPeriod.id()),
                currentPlanning.completedCount(),
                currentPlanning.sharedResourcesCount(),
                loadStandoutStudentsCount(course.id(), currentPeriod.id())
        );
    }

    private AttendanceMetrics loadAttendanceMetrics(Long courseId, SemesterWindow window) {
        return jdbcTemplate.query("""
                SELECT
                    COUNT(1) FILTER (WHERE UPPER(COALESCE(ad."ESTADO", '')) = 'PRESENTE') AS present_count,
                    COUNT(1) FILTER (WHERE UPPER(COALESCE(ad."ESTADO", '')) IN ('ATRASO', 'ATRASADO')) AS late_count,
                    COUNT(1) FILTER (
                        WHERE UPPER(COALESCE(ad."ESTADO", '')) = 'AUSENTE'
                           OR UPPER(COALESCE(ad."ESTADO", '')) IN ('SUSPENDIDO', 'SUSPENSION', 'SUSPENSIÓN')
                    ) AS absent_count,
                    COUNT(1) AS total_count
                FROM "ASISTENCIA_DETALLES" ad
                JOIN "ASISTENCIA_REGISTROS" ar ON ar."ID" = ad."REGISTRO_ID"
                WHERE ar."CURSO_ID" = ?
                  AND ar."ACTIVO" = TRUE
                  AND ad."ACTIVO" = TRUE
                  AND COALESCE(ar."CLASES_SUSPENDIDAS", FALSE) = FALSE
                  AND ar."FECHA" BETWEEN ? AND ?
                """, (rs, rowNum) -> {
            int presentCount = rs.getInt("present_count");
            int lateCount = rs.getInt("late_count");
            int absentCount = rs.getInt("absent_count");
            int totalCount = rs.getInt("total_count");
            if (totalCount <= 0) {
                return new AttendanceMetrics(0, 0, 0, 0);
            }

            int presentPercent = (int) Math.round((presentCount * 100.0) / totalCount);
            int latePercent = (int) Math.round((lateCount * 100.0) / totalCount);
            int absentPercent = Math.max(0, 100 - presentPercent - latePercent);
            int averageAttendance = Math.min(100, presentPercent + latePercent);
            return new AttendanceMetrics(averageAttendance, presentPercent, latePercent, absentPercent);
        }, courseId, window.startDate(), window.endDate()).stream().findFirst()
                .orElse(new AttendanceMetrics(0, 0, 0, 0));
    }

    private List<Integer> loadAttendanceSeries(Long courseId, SemesterWindow window) {
        Map<Integer, AttendanceMetrics> metricsByMonth = jdbcTemplate.query("""
                SELECT
                    EXTRACT(MONTH FROM ar."FECHA")::int AS month_number,
                    COUNT(1) FILTER (WHERE UPPER(COALESCE(ad."ESTADO", '')) = 'PRESENTE') AS present_count,
                    COUNT(1) FILTER (WHERE UPPER(COALESCE(ad."ESTADO", '')) IN ('ATRASO', 'ATRASADO')) AS late_count,
                    COUNT(1) FILTER (
                        WHERE UPPER(COALESCE(ad."ESTADO", '')) = 'AUSENTE'
                           OR UPPER(COALESCE(ad."ESTADO", '')) IN ('SUSPENDIDO', 'SUSPENSION', 'SUSPENSIÓN')
                    ) AS absent_count,
                    COUNT(1) AS total_count
                FROM "ASISTENCIA_DETALLES" ad
                JOIN "ASISTENCIA_REGISTROS" ar ON ar."ID" = ad."REGISTRO_ID"
                WHERE ar."CURSO_ID" = ?
                  AND ar."ACTIVO" = TRUE
                  AND ad."ACTIVO" = TRUE
                  AND COALESCE(ar."CLASES_SUSPENDIDAS", FALSE) = FALSE
                  AND ar."FECHA" BETWEEN ? AND ?
                GROUP BY month_number
                """, rs -> {
            Map<Integer, AttendanceMetrics> values = new LinkedHashMap<>();
            while (rs.next()) {
                int presentCount = rs.getInt("present_count");
                int lateCount = rs.getInt("late_count");
                int absentCount = rs.getInt("absent_count");
                int totalCount = rs.getInt("total_count");
                int averageAttendance = totalCount <= 0
                        ? 0
                        : Math.min(100, (int) Math.round(((presentCount + lateCount) * 100.0) / totalCount));
                int presentPercent = totalCount <= 0 ? 0 : (int) Math.round((presentCount * 100.0) / totalCount);
                int latePercent = totalCount <= 0 ? 0 : (int) Math.round((lateCount * 100.0) / totalCount);
                int absentPercent = totalCount <= 0 ? 0 : Math.max(0, 100 - presentPercent - latePercent);
                values.put(
                        rs.getInt("month_number"),
                        new AttendanceMetrics(averageAttendance, presentPercent, latePercent, absentPercent)
                );
            }
            return values;
        }, courseId, window.startDate(), window.endDate());

        return window.monthNumbers().stream()
                .map(month -> metricsByMonth.getOrDefault(month, new AttendanceMetrics(0, 0, 0, 0)).averageAttendance())
                .toList();
    }

    private double loadAverageGrade(Long courseId, Long periodId) {
        if (periodId == null) {
            return 0.0;
        }

        Double average = jdbcTemplate.queryForObject("""
                SELECT ROUND(AVG(cal."NOTA")::numeric, 1)
                FROM "CALIFICACIONES" cal
                JOIN "EVALUACIONES" e ON e."ID" = cal."EVALUACION_ID"
                WHERE e."CURSO_ID" = ?
                  AND e."PERIODO_ID" = ?
                  AND e."ACTIVA" = TRUE
                  AND cal."ACTIVA" = TRUE
                  AND COALESCE(NULLIF(TRIM(e."TIPO_REGISTRO"), ''), 'SUMATIVA') <> 'DIAGNOSTICA'
                  AND cal."NOTA" IS NOT NULL
                """, Double.class, courseId, periodId);
        return roundOneDecimal(average == null ? 0.0 : average);
    }

    private List<Double> loadGradeSeries(Long courseId, Long periodId, List<Integer> monthNumbers) {
        if (periodId == null) {
            return monthNumbers.stream().map(ignored -> (Double) null).toList();
        }

        Map<Integer, Double> averagesByMonth = jdbcTemplate.query("""
                SELECT
                    EXTRACT(MONTH FROM COALESCE(
                        e."FECHA_EVALUACION",
                        DATE(cal."ACTUALIZADO_EN"),
                        DATE(cal."CREADO_EN")
                    ))::int AS month_number,
                    ROUND(AVG(cal."NOTA")::numeric, 1) AS average_score
                FROM "CALIFICACIONES" cal
                JOIN "EVALUACIONES" e ON e."ID" = cal."EVALUACION_ID"
                WHERE e."CURSO_ID" = ?
                  AND e."PERIODO_ID" = ?
                  AND e."ACTIVA" = TRUE
                  AND cal."ACTIVA" = TRUE
                  AND COALESCE(NULLIF(TRIM(e."TIPO_REGISTRO"), ''), 'SUMATIVA') <> 'DIAGNOSTICA'
                  AND cal."NOTA" IS NOT NULL
                GROUP BY month_number
                """, rs -> {
            Map<Integer, Double> values = new LinkedHashMap<>();
            while (rs.next()) {
                values.put(rs.getInt("month_number"), rs.getDouble("average_score"));
            }
            return values;
        }, courseId, periodId);

        return monthNumbers.stream()
                .map(month -> {
                    Double value = averagesByMonth.get(month);
                    return value == null ? null : roundOneDecimal(value);
                })
                .toList();
    }

    private PlanningMetrics loadPlanningMetrics(Long courseId, SemesterWindow window) {
        return jdbcTemplate.query("""
                WITH units AS (
                    SELECT
                        up."ID" AS unit_id,
                        COALESCE(up."CLASES_PLANIFICADAS", 0) AS planned_classes
                    FROM "UNIDADES_PLANIFICACION" up
                    JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                    WHERE cd."CURSO_ID" = ?
                      AND COALESCE(up."FECHA_INICIO", up."FECHA_TERMINO", CURRENT_DATE) BETWEEN ? AND ?
                ),
                classes AS (
                    SELECT
                        cp."ID" AS class_id,
                        COALESCE(cp."ESTADO", 'BORRADOR') AS status_code
                    FROM "CLASES_PLANIFICACION" cp
                    WHERE cp."UNIDAD_ID" IN (SELECT unit_id FROM units)
                ),
                documents AS (
                    SELECT
                        pd."ID" AS document_id,
                        pd."VISIBLE_ALUMNOS" AS visible_to_students
                    FROM "CLASES_PLANIFICACION_DOCUMENTOS" pd
                    WHERE pd."UNIDAD_ID" IN (SELECT unit_id FROM units)
                      AND COALESCE(pd."ELIMINADO", FALSE) = FALSE
                      AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
                      AND DATE(pd."FECHA_CARGA") BETWEEN ? AND ?
                )
                SELECT
                    COALESCE((SELECT SUM(planned_classes) FROM units), 0) AS target_classes,
                    COALESCE((SELECT COUNT(1) FROM classes), 0) AS total_classes,
                    COALESCE((SELECT COUNT(1) FROM classes WHERE status_code = 'PUBLICADA'), 0) AS published_classes,
                    COALESCE((SELECT COUNT(1) FROM documents), 0) AS total_documents,
                    COALESCE((SELECT COUNT(1) FROM documents WHERE visible_to_students = TRUE), 0) AS visible_documents
                """, (rs, rowNum) -> {
            int targetClasses = rs.getInt("target_classes");
            int totalClasses = rs.getInt("total_classes");
            int publishedClasses = rs.getInt("published_classes");
            int inProgress = Math.max(totalClasses - publishedClasses, 0);
            int pending = Math.max(targetClasses - totalClasses, 0);
            int denominator = publishedClasses + inProgress + pending;
            int progress = denominator <= 0 ? 0 : (int) Math.round((publishedClasses * 100.0) / denominator);
            return new PlanningMetrics(
                    publishedClasses,
                    inProgress,
                    pending,
                    progress,
                    rs.getInt("visible_documents")
            );
        }, courseId, window.startDate(), window.endDate(), window.startDate(), window.endDate()).stream().findFirst()
                .orElse(new PlanningMetrics(0, 0, 0, 0, 0));
    }

    private List<Integer> loadPlanningSeries(Long courseId, SemesterWindow window) {
        Map<Integer, Integer> plannedByMonth = jdbcTemplate.query("""
                SELECT
                    EXTRACT(MONTH FROM COALESCE(up."FECHA_INICIO", up."FECHA_TERMINO", CURRENT_DATE))::int AS month_number,
                    COALESCE(SUM(COALESCE(up."CLASES_PLANIFICADAS", 0)), 0) AS planned_classes
                FROM "UNIDADES_PLANIFICACION" up
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                WHERE cd."CURSO_ID" = ?
                  AND COALESCE(up."FECHA_INICIO", up."FECHA_TERMINO", CURRENT_DATE) BETWEEN ? AND ?
                GROUP BY month_number
                """, rs -> {
            Map<Integer, Integer> values = new LinkedHashMap<>();
            while (rs.next()) {
                values.put(rs.getInt("month_number"), rs.getInt("planned_classes"));
            }
            return values;
        }, courseId, window.startDate(), window.endDate());

        Map<Integer, Integer> publishedByMonth = jdbcTemplate.query("""
                SELECT
                    EXTRACT(MONTH FROM COALESCE(cp."FECHA_PLANIFICADA", up."FECHA_INICIO", up."FECHA_TERMINO", CURRENT_DATE))::int AS month_number,
                    COUNT(1) FILTER (WHERE COALESCE(cp."ESTADO", 'BORRADOR') = 'PUBLICADA') AS published_classes
                FROM "CLASES_PLANIFICACION" cp
                JOIN "UNIDADES_PLANIFICACION" up ON up."ID" = cp."UNIDAD_ID"
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                WHERE cd."CURSO_ID" = ?
                  AND COALESCE(cp."FECHA_PLANIFICADA", up."FECHA_INICIO", up."FECHA_TERMINO", CURRENT_DATE) BETWEEN ? AND ?
                GROUP BY month_number
                """, rs -> {
            Map<Integer, Integer> values = new LinkedHashMap<>();
            while (rs.next()) {
                values.put(rs.getInt("month_number"), rs.getInt("published_classes"));
            }
            return values;
        }, courseId, window.startDate(), window.endDate());

        int plannedRunning = 0;
        int publishedRunning = 0;
        List<Integer> progress = new ArrayList<>();
        for (Integer month : window.monthNumbers()) {
            plannedRunning += plannedByMonth.getOrDefault(month, 0);
            publishedRunning += publishedByMonth.getOrDefault(month, 0);

            if (plannedRunning <= 0) {
                progress.add(0);
                continue;
            }

            progress.add(Math.min(100, (int) Math.round((publishedRunning * 100.0) / plannedRunning)));
        }

        return progress;
    }

    private int loadAnnotationCount(Long courseId, SemesterWindow window) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "HOJA_VIDA_CONVIVENCIA" hv
                JOIN "MATRICULAS" m ON m."ALUMNO_ID" = hv."ALUMNO_ID"
                WHERE m."CURSO_ID" = ?
                  AND m."ACTIVA" = TRUE
                  AND hv."ACTIVA" = TRUE
                  AND hv."FECHA" BETWEEN ? AND ?
                """, Integer.class, courseId, window.startDate(), window.endDate());
        return count == null ? 0 : count;
    }

    private List<Integer> loadAnnotationSeries(Long courseId, SemesterWindow window) {
        Map<Integer, Integer> countsByMonth = jdbcTemplate.query("""
                SELECT
                    EXTRACT(MONTH FROM hv."FECHA")::int AS month_number,
                    COUNT(1) AS total_count
                FROM "HOJA_VIDA_CONVIVENCIA" hv
                JOIN "MATRICULAS" m ON m."ALUMNO_ID" = hv."ALUMNO_ID"
                WHERE m."CURSO_ID" = ?
                  AND m."ACTIVA" = TRUE
                  AND hv."ACTIVA" = TRUE
                  AND hv."FECHA" BETWEEN ? AND ?
                GROUP BY month_number
                """, rs -> {
            Map<Integer, Integer> values = new LinkedHashMap<>();
            while (rs.next()) {
                values.put(rs.getInt("month_number"), rs.getInt("total_count"));
            }
            return values;
        }, courseId, window.startDate(), window.endDate());

        return window.monthNumbers().stream()
                .map(month -> countsByMonth.getOrDefault(month, 0))
                .toList();
    }

    private int loadEvaluationCount(Long courseId, Long periodId) {
        if (periodId == null) {
            return 0;
        }
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "EVALUACIONES"
                WHERE "CURSO_ID" = ?
                  AND "PERIODO_ID" = ?
                  AND "ACTIVA" = TRUE
                """, Integer.class, courseId, periodId);
        return count == null ? 0 : count;
    }

    private int loadStandoutStudentsCount(Long courseId, Long periodId) {
        if (periodId == null) {
            return 0;
        }

        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM (
                    SELECT
                        cal."ALUMNO_ID",
                        AVG(cal."NOTA") AS average_score
                    FROM "CALIFICACIONES" cal
                    JOIN "EVALUACIONES" e ON e."ID" = cal."EVALUACION_ID"
                    WHERE e."CURSO_ID" = ?
                      AND e."PERIODO_ID" = ?
                      AND e."ACTIVA" = TRUE
                      AND cal."ACTIVA" = TRUE
                      AND COALESCE(NULLIF(TRIM(e."TIPO_REGISTRO"), ''), 'SUMATIVA') <> 'DIAGNOSTICA'
                      AND cal."NOTA" IS NOT NULL
                    GROUP BY cal."ALUMNO_ID"
                    HAVING AVG(cal."NOTA") >= 6.0
                ) standout_students
                """, Integer.class, courseId, periodId);
        return count == null ? 0 : count;
    }

    private String resolveLevelId(String gradeName, String displayName) {
        String normalized = normalizeForMatch(gradeName + " " + displayName);
        if (normalized.contains("PREKINDER") || normalized.contains("KINDER") || normalized.matches(".*\\bPK\\b.*")) {
            return "parvularia";
        }
        if (normalized.matches(".*\\b([1-6])\\s+BASICO\\b.*")) {
            return "basica";
        }
        if (normalized.matches(".*\\b([7-8])\\s+BASICO\\b.*") || normalized.contains("MEDIO")) {
            return "media";
        }
        return "basica";
    }

    private String normalizeForMatch(String value) {
        String normalized = Normalizer.normalize(safeText(value), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return normalized.toUpperCase(Locale.ROOT)
                .replace("\u00b0", " ")
                .replace("\u00ba", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private record UserContext(Long teacherId, boolean isAdmin) {
    }

    private record PeriodContext(Long id, String name) {
    }

    private record CourseContext(Long id, String name, String levelId, String teacher, int students) {
    }

    private record AttendanceMetrics(int averageAttendance, int presentPercent, int latePercent, int absentPercent) {
    }

    private record PlanningMetrics(
            int completedCount,
            int inProgressCount,
            int pendingCount,
            int progressPercent,
            int sharedResourcesCount
    ) {
    }

    private record SemesterWindow(
            int year,
            int semester,
            LocalDate startDate,
            LocalDate endDate,
            List<Integer> monthNumbers,
            List<String> chartLabels
    ) {
        private static SemesterWindow of(int year, int semester) {
            List<Integer> monthNumbers = semester == 1
                    ? List.of(3, 4, 5, 6)
                    : List.of(7, 8, 9, 10, 11, 12);
            return new SemesterWindow(
                    year,
                    semester,
                    LocalDate.of(year, semester == 1 ? 3 : 7, 1),
                    LocalDate.of(year, semester == 1 ? 6 : 12, Month.of(semester == 1 ? 6 : 12).length(Year.isLeap(year))),
                    monthNumbers,
                    monthNumbers.stream()
                            .map(month -> Month.of(month).getDisplayName(TextStyle.SHORT, SPANISH))
                            .map(label -> {
                                String trimmed = label.replace(".", "");
                                return trimmed.substring(0, 1).toUpperCase(SPANISH) + trimmed.substring(1).toLowerCase(SPANISH);
                            })
                            .toList()
            );
        }

        private SemesterWindow previous() {
            if (semester == 1) {
                return of(year - 1, 2);
            }
            return of(year, 1);
        }
    }
}
