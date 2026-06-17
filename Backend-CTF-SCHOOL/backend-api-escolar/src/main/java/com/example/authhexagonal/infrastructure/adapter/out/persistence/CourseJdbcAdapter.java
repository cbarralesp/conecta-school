package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.Course;
import com.example.authhexagonal.domain.model.CourseGrade;
import com.example.authhexagonal.domain.model.CourseScheduleAssignment;
import com.example.authhexagonal.domain.model.MasterCourse;
import com.example.authhexagonal.domain.model.StudentCatalogItem;
import com.example.authhexagonal.domain.model.TeacherCatalogItem;
import com.example.authhexagonal.domain.port.out.LoadCourseSchedulePort;
import com.example.authhexagonal.domain.port.out.LoadMasterCoursesPort;
import com.example.authhexagonal.domain.port.out.ManageCoursesPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class CourseJdbcAdapter implements ManageCoursesPort, LoadCourseSchedulePort, LoadMasterCoursesPort {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final JdbcTemplate jdbcTemplate;

    public CourseJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<CourseGrade> findActiveGrades() {
        if (!tableExists("CURSO_GRADOS")) {
            return List.of();
        }

        return jdbcTemplate.query("""
                SELECT
                    cg."ID",
                    COALESCE(cn."NOMBRE", '') AS "NIVEL_NOMBRE",
                    cg."NOMBRE",
                    cg."CODIGO_TOKEN",
                    cg."ORDEN",
                    cg."ACTIVO"
                FROM "CURSO_GRADOS" cg
                LEFT JOIN "CURSO_NIVELES" cn
                  ON cn."ID" = cg."NIVEL_ID"
                WHERE cg."ACTIVO" = TRUE
                ORDER BY cg."ORDEN", cg."NOMBRE"
                """, (rs, rowNum) -> new CourseGrade(
                rs.getLong("ID"),
                rs.getString("NIVEL_NOMBRE"),
                rs.getString("NOMBRE"),
                rs.getString("CODIGO_TOKEN"),
                rs.getInt("ORDEN"),
                rs.getBoolean("ACTIVO")
        ));
    }

    @Override
    public List<Course> findAllActive() {
        if (!courseNormalizationAvailable()) {
            return jdbcTemplate.query("""
                    SELECT
                        c."ID",
                        c."CODIGO",
                        c."NOMBRE",
                        c."NIVEL",
                        c."LETRA",
                        c."ANIO_ESCOLAR",
                        c."JORNADA",
                        cd."PROFESOR_ID" AS teacher_id,
                        tp."NOMBRES" || ' ' || tp."APELLIDOS" AS teacher_name,
                        cd."ASISTENTE_ID" AS assistant_id,
                        ta."NOMBRES" || ' ' || ta."APELLIDOS" AS assistant_name,
                        c."ACTIVO",
                        COUNT(m."ID") AS student_count
                    FROM "CURSOS"
                    c
                    LEFT JOIN "CURSO_DOCENTES" cd
                      ON cd."CURSO_ID" = c."ID"
                    LEFT JOIN "PROFESORES" pt
                      ON pt."ID" = cd."PROFESOR_ID"
                    LEFT JOIN "PERSONAS" tp
                      ON tp."ID" = pt."PERSONA_ID"
                    LEFT JOIN "PROFESORES" pa
                      ON pa."ID" = cd."ASISTENTE_ID"
                    LEFT JOIN "PERSONAS" ta
                      ON ta."ID" = pa."PERSONA_ID"
                    LEFT JOIN "MATRICULAS" m
                      ON m."CURSO_ID" = c."ID"
                     AND m."ACTIVA" = TRUE
                    WHERE c."ACTIVO" = TRUE
                    GROUP BY c."ID", c."CODIGO", c."NOMBRE", c."NIVEL", c."LETRA", c."ANIO_ESCOLAR", c."JORNADA", cd."PROFESOR_ID", tp."NOMBRES", tp."APELLIDOS", cd."ASISTENTE_ID", ta."NOMBRES", ta."APELLIDOS", c."ACTIVO"
                    ORDER BY c."ANIO_ESCOLAR", c."NIVEL", c."LETRA"
                    """, (rs, rowNum) -> new Course(
                    rs.getLong("ID"),
                    rs.getString("CODIGO"),
                    rs.getString("NOMBRE"),
                    rs.getString("NIVEL"),
                    rs.getString("LETRA"),
                    null,
                    rs.getInt("ANIO_ESCOLAR"),
                    rs.getString("JORNADA"),
                    (Long) rs.getObject("teacher_id"),
                    rs.getString("teacher_name"),
                    (Long) rs.getObject("assistant_id"),
                    rs.getString("assistant_name"),
                    rs.getBoolean("ACTIVO"),
                    rs.getInt("student_count")
            ));
        }

        return jdbcTemplate.query("""
                SELECT
                    c."ID",
                    c."CODIGO",
                    COALESCE(NULLIF(BTRIM(c."NOMBRE"), ''), cg."NOMBRE") AS "NOMBRE",
                    COALESCE(cn."NOMBRE", c."NIVEL") AS "NIVEL",
                    c."LETRA",
                    c."GRADO_ID",
                    c."ANIO_ESCOLAR",
                    COALESCE(cj."NOMBRE", c."JORNADA") AS "JORNADA",
                    cd."PROFESOR_ID" AS teacher_id,
                    tp."NOMBRES" || ' ' || tp."APELLIDOS" AS teacher_name,
                    cd."ASISTENTE_ID" AS assistant_id,
                    ta."NOMBRES" || ' ' || ta."APELLIDOS" AS assistant_name,
                    c."ACTIVO",
                    COUNT(m."ID") AS student_count
                FROM "CURSOS"
                c
                LEFT JOIN "CURSO_GRADOS" cg
                  ON cg."ID" = c."GRADO_ID"
                LEFT JOIN "CURSO_NIVELES" cn
                  ON cn."ID" = cg."NIVEL_ID"
                LEFT JOIN "CURSO_JORNADAS" cj
                  ON cj."ID" = c."JORNADA_ID"
                LEFT JOIN "CURSO_DOCENTES" cd
                  ON cd."CURSO_ID" = c."ID"
                LEFT JOIN "PROFESORES" pt
                  ON pt."ID" = cd."PROFESOR_ID"
                LEFT JOIN "PERSONAS" tp
                  ON tp."ID" = pt."PERSONA_ID"
                LEFT JOIN "PROFESORES" pa
                  ON pa."ID" = cd."ASISTENTE_ID"
                LEFT JOIN "PERSONAS" ta
                  ON ta."ID" = pa."PERSONA_ID"
                LEFT JOIN "MATRICULAS" m
                  ON m."CURSO_ID" = c."ID"
                 AND m."ACTIVA" = TRUE
                WHERE c."ACTIVO" = TRUE
                GROUP BY c."ID", c."CODIGO", c."NOMBRE", c."NIVEL", c."LETRA", c."ANIO_ESCOLAR", c."JORNADA", cg."NOMBRE", cn."NOMBRE", cj."NOMBRE", cd."PROFESOR_ID", tp."NOMBRES", tp."APELLIDOS", cd."ASISTENTE_ID", ta."NOMBRES", ta."APELLIDOS", c."ACTIVO"
                ORDER BY c."ANIO_ESCOLAR", COALESCE(NULLIF(BTRIM(c."NOMBRE"), ''), cg."NOMBRE"), c."LETRA"
                """, (rs, rowNum) -> new Course(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getString("NIVEL"),
                rs.getString("LETRA"),
                (Long) rs.getObject("GRADO_ID"),
                rs.getInt("ANIO_ESCOLAR"),
                rs.getString("JORNADA"),
                (Long) rs.getObject("teacher_id"),
                rs.getString("teacher_name"),
                (Long) rs.getObject("assistant_id"),
                rs.getString("assistant_name"),
                rs.getBoolean("ACTIVO"),
                rs.getInt("student_count")
        ));
    }

    @Override
    public Optional<Course> findActiveById(Long courseId) {
        if (!courseNormalizationAvailable()) {
            return jdbcTemplate.query("""
                    SELECT
                        c."ID",
                        c."CODIGO",
                        c."NOMBRE",
                        c."NIVEL",
                        c."LETRA",
                        NULL::bigint AS "GRADO_ID",
                        c."ANIO_ESCOLAR",
                        c."JORNADA",
                        cd."PROFESOR_ID" AS teacher_id,
                        tp."NOMBRES" || ' ' || tp."APELLIDOS" AS teacher_name,
                        cd."ASISTENTE_ID" AS assistant_id,
                        ta."NOMBRES" || ' ' || ta."APELLIDOS" AS assistant_name,
                        c."ACTIVO",
                        COUNT(m."ID") AS student_count
                    FROM "CURSOS" c
                    LEFT JOIN "CURSO_DOCENTES" cd
                      ON cd."CURSO_ID" = c."ID"
                    LEFT JOIN "PROFESORES" pt
                      ON pt."ID" = cd."PROFESOR_ID"
                    LEFT JOIN "PERSONAS" tp
                      ON tp."ID" = pt."PERSONA_ID"
                    LEFT JOIN "PROFESORES" pa
                      ON pa."ID" = cd."ASISTENTE_ID"
                    LEFT JOIN "PERSONAS" ta
                      ON ta."ID" = pa."PERSONA_ID"
                    LEFT JOIN "MATRICULAS" m
                      ON m."CURSO_ID" = c."ID"
                     AND m."ACTIVA" = TRUE
                    WHERE c."ID" = ?
                      AND c."ACTIVO" = TRUE
                    GROUP BY c."ID", c."CODIGO", c."NOMBRE", c."NIVEL", c."LETRA", c."ANIO_ESCOLAR", c."JORNADA", cd."PROFESOR_ID", tp."NOMBRES", tp."APELLIDOS", cd."ASISTENTE_ID", ta."NOMBRES", ta."APELLIDOS", c."ACTIVO"
                    """, (rs, rowNum) -> new Course(
                    rs.getLong("ID"),
                    rs.getString("CODIGO"),
                    rs.getString("NOMBRE"),
                    rs.getString("NIVEL"),
                    rs.getString("LETRA"),
                    (Long) rs.getObject("GRADO_ID"),
                    rs.getInt("ANIO_ESCOLAR"),
                    rs.getString("JORNADA"),
                    (Long) rs.getObject("teacher_id"),
                    rs.getString("teacher_name"),
                    (Long) rs.getObject("assistant_id"),
                    rs.getString("assistant_name"),
                    rs.getBoolean("ACTIVO"),
                    rs.getInt("student_count")
            ), courseId).stream().findFirst();
        }

        return jdbcTemplate.query("""
                SELECT
                    c."ID",
                    c."CODIGO",
                    COALESCE(NULLIF(BTRIM(c."NOMBRE"), ''), cg."NOMBRE") AS "NOMBRE",
                    COALESCE(cn."NOMBRE", c."NIVEL") AS "NIVEL",
                    c."LETRA",
                    c."GRADO_ID",
                    c."ANIO_ESCOLAR",
                    COALESCE(cj."NOMBRE", c."JORNADA") AS "JORNADA",
                    cd."PROFESOR_ID" AS teacher_id,
                    tp."NOMBRES" || ' ' || tp."APELLIDOS" AS teacher_name,
                    cd."ASISTENTE_ID" AS assistant_id,
                    ta."NOMBRES" || ' ' || ta."APELLIDOS" AS assistant_name,
                    c."ACTIVO",
                    COUNT(m."ID") AS student_count
                FROM "CURSOS" c
                LEFT JOIN "CURSO_GRADOS" cg
                  ON cg."ID" = c."GRADO_ID"
                LEFT JOIN "CURSO_NIVELES" cn
                  ON cn."ID" = cg."NIVEL_ID"
                LEFT JOIN "CURSO_JORNADAS" cj
                  ON cj."ID" = c."JORNADA_ID"
                LEFT JOIN "CURSO_DOCENTES" cd
                  ON cd."CURSO_ID" = c."ID"
                LEFT JOIN "PROFESORES" pt
                  ON pt."ID" = cd."PROFESOR_ID"
                LEFT JOIN "PERSONAS" tp
                  ON tp."ID" = pt."PERSONA_ID"
                LEFT JOIN "PROFESORES" pa
                  ON pa."ID" = cd."ASISTENTE_ID"
                LEFT JOIN "PERSONAS" ta
                  ON ta."ID" = pa."PERSONA_ID"
                LEFT JOIN "MATRICULAS" m
                  ON m."CURSO_ID" = c."ID"
                 AND m."ACTIVA" = TRUE
                WHERE c."ID" = ?
                  AND c."ACTIVO" = TRUE
                GROUP BY c."ID", c."CODIGO", c."NOMBRE", c."NIVEL", c."LETRA", c."ANIO_ESCOLAR", c."JORNADA", cg."NOMBRE", cn."NOMBRE", cj."NOMBRE", cd."PROFESOR_ID", tp."NOMBRES", tp."APELLIDOS", cd."ASISTENTE_ID", ta."NOMBRES", ta."APELLIDOS", c."ACTIVO"
                """, (rs, rowNum) -> new Course(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getString("NIVEL"),
                rs.getString("LETRA"),
                (Long) rs.getObject("GRADO_ID"),
                rs.getInt("ANIO_ESCOLAR"),
                rs.getString("JORNADA"),
                (Long) rs.getObject("teacher_id"),
                rs.getString("teacher_name"),
                (Long) rs.getObject("assistant_id"),
                rs.getString("assistant_name"),
                rs.getBoolean("ACTIVO"),
                rs.getInt("student_count")
        ), courseId).stream().findFirst();
    }

    @Override
    public boolean existsByCode(String code) {
        Integer exists = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "CURSOS"
                WHERE UPPER("CODIGO") = UPPER(?)
                """, Integer.class, code);
        return exists != null && exists > 0;
    }

    @Override
    public boolean existsByCodeExcludingId(String code, Long courseId) {
        Integer exists = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "CURSOS"
                WHERE UPPER("CODIGO") = UPPER(?)
                  AND "ID" <> ?
                """, Integer.class, code, courseId);
        return exists != null && exists > 0;
    }

    @Override
    public Course create(String code, String name, String level, String letter, int schoolYear, String scheduleType) {
        String normalizedName = normalizeGradeDisplayName(name);
        String normalizedLevel = normalizeLevelDisplayName(level);
        String normalizedSchedule = normalizeScheduleDisplayName(scheduleType);
        Long gradeId = resolveGradeId(normalizedName);
        Long scheduleId = resolveScheduleId(normalizedSchedule);
        Long id = jdbcTemplate.queryForObject("""
                INSERT INTO "CURSOS" ("CODIGO", "NOMBRE", "NIVEL", "LETRA", "ANIO_ESCOLAR", "JORNADA", "GRADO_ID", "JORNADA_ID", "ACTIVO")
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                RETURNING "ID"
                """, Long.class, code, normalizedName, normalizedLevel, letter, schoolYear, normalizedSchedule, gradeId, scheduleId);

        ensureCourseSubjectsFromReference(id, gradeId);

        return findActiveById(id).orElseThrow();
    }

    @Override
    public void assignTeacherTeam(Long courseId, Long teacherId, Long assistantId) {
        int updated = jdbcTemplate.update("""
                UPDATE "CURSO_DOCENTES"
                SET "PROFESOR_ID" = ?,
                    "ASISTENTE_ID" = ?
                WHERE "CURSO_ID" = ?
                """, teacherId, assistantId, courseId);

        if (updated == 0) {
            jdbcTemplate.update("""
                    INSERT INTO "CURSO_DOCENTES" ("CURSO_ID", "PROFESOR_ID", "ASISTENTE_ID")
                    VALUES (?, ?, ?)
                    """, courseId, teacherId, assistantId);
        }

        ensureCourseSubjectsFromReference(courseId, null);
        ensureTeacherLoadsForCourse(courseId, teacherId);
    }

    @Override
    public void assignStudents(Long courseId, List<Long> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) {
            return;
        }

        for (Long studentId : studentIds) {
            List<Long> enrollmentIds = jdbcTemplate.query("""
                    SELECT "ID"
                    FROM "MATRICULAS"
                    WHERE "ALUMNO_ID" = ?
                    ORDER BY "ID"
                    LIMIT 1
                    """, (rs, rowNum) -> rs.getLong("ID"), studentId);

            if (enrollmentIds.isEmpty()) {
                jdbcTemplate.update("""
                        INSERT INTO "MATRICULAS" (
                            "ALUMNO_ID",
                            "CURSO_ID",
                            "ESTADO",
                            "FECHA_MATRICULA",
                            "ACTIVA",
                            "OBSERVACIONES"
                        )
                        VALUES (?, ?, 'ACTIVO', CURRENT_DATE, TRUE, 'Asignado desde Crear curso')
                        """, studentId, courseId);
            } else {
                jdbcTemplate.update("""
                        UPDATE "MATRICULAS"
                        SET "CURSO_ID" = ?,
                            "ESTADO" = 'ACTIVO',
                            "ACTIVA" = TRUE,
                            "FECHA_MATRICULA" = COALESCE("FECHA_MATRICULA", CURRENT_DATE),
                            "OBSERVACIONES" = COALESCE(NULLIF("OBSERVACIONES", ''), 'Asignado desde Crear curso')
                        WHERE "ID" = ?
                        """, courseId, enrollmentIds.getFirst());
            }

            syncLegacyCourseStudent(courseId, studentId);
        }
    }

    @Override
    public List<Long> findActiveStudentIds(Long courseId) {
        return jdbcTemplate.query("""
                SELECT "ALUMNO_ID"
                FROM "MATRICULAS"
                WHERE "CURSO_ID" = ?
                  AND "ACTIVA" = TRUE
                ORDER BY "ID"
                """, (rs, rowNum) -> rs.getLong("ALUMNO_ID"), courseId);
    }

    @Override
    public void syncStudents(Long courseId, List<Long> studentIds) {
        Set<Long> selectedIds = studentIds == null ? Set.of() : new HashSet<>(studentIds);
        Set<Long> currentIds = new HashSet<>(findActiveStudentIds(courseId));

        for (Long currentId : currentIds) {
            if (!selectedIds.contains(currentId)) {
                jdbcTemplate.update("""
                        UPDATE "MATRICULAS"
                        SET "ACTIVA" = FALSE,
                            "ESTADO" = 'INACTIVA'
                        WHERE "CURSO_ID" = ?
                          AND "ALUMNO_ID" = ?
                          AND "ACTIVA" = TRUE
                        """, courseId, currentId);

                if (tableExists("CURSO_ALUMNOS")) {
                    jdbcTemplate.update("""
                            UPDATE "CURSO_ALUMNOS"
                            SET "ACTIVO" = FALSE
                            WHERE "CURSO_ID" = ?
                              AND "ALUMNO_ID" = ?
                            """, courseId, currentId);
                }
            }
        }

        List<Long> studentsToAdd = selectedIds.stream()
                .filter(studentId -> !currentIds.contains(studentId))
                .toList();

        assignStudents(courseId, studentsToAdd);
    }

    @Override
    public Course update(Long courseId, String code, String name, String level, String letter, int schoolYear, String scheduleType) {
        String normalizedName = normalizeGradeDisplayName(name);
        String normalizedLevel = normalizeLevelDisplayName(level);
        String normalizedSchedule = normalizeScheduleDisplayName(scheduleType);
        Long gradeId = resolveGradeId(normalizedName);
        Long scheduleId = resolveScheduleId(normalizedSchedule);
        jdbcTemplate.update("""
                UPDATE "CURSOS"
                SET "CODIGO" = ?,
                    "NOMBRE" = ?,
                    "NIVEL" = ?,
                    "LETRA" = ?,
                    "ANIO_ESCOLAR" = ?,
                    "JORNADA" = ?,
                    "GRADO_ID" = ?,
                    "JORNADA_ID" = ?
                WHERE "ID" = ?
                """, code, normalizedName, normalizedLevel, letter, schoolYear, normalizedSchedule, gradeId, scheduleId, courseId);

        ensureCourseSubjectsFromReference(courseId, gradeId);

        return findActiveById(courseId).orElseThrow();
    }

    @Override
    public void deactivate(Long courseId) {
        String currentCode = jdbcTemplate.queryForObject("""
                SELECT "CODIGO"
                FROM "CURSOS"
                WHERE "ID" = ?
                """, String.class, courseId);
        String archivedCode = buildArchivedCourseCode(currentCode, courseId);

        jdbcTemplate.update("""
                UPDATE "CURSOS"
                SET "CODIGO" = ?,
                    "ACTIVO" = FALSE
                WHERE "ID" = ?
                """, archivedCode, courseId);

        jdbcTemplate.update("""
                UPDATE "MATRICULAS"
                SET "ACTIVA" = FALSE,
                    "ESTADO" = 'INACTIVA'
                WHERE "CURSO_ID" = ?
                  AND "ACTIVA" = TRUE
                """, courseId);

        if (tableExists("CURSO_ALUMNOS")) {
            jdbcTemplate.update("""
                    UPDATE "CURSO_ALUMNOS"
                    SET "ACTIVO" = FALSE
                    WHERE "CURSO_ID" = ?
                    """, courseId);
        }
    }

    @Override
    public List<CourseScheduleAssignment> findAllScheduleAssignments() {
        return jdbcTemplate.query("""
                SELECT
                    hc."ID",
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    pe."NOMBRES" || ' ' || pe."APELLIDOS" AS teacher_name,
                    bh."DIA_SEMANA",
                    bh."HORA_INICIO",
                    bh."HORA_FIN"
                FROM "HORARIOS_CARGAS" hc
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = hc."CARGA_DOCENTE_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                JOIN "PROFESORES" p ON p."ID" = cd."PROFESOR_ID"
                JOIN "PERSONAS" pe ON pe."ID" = p."PERSONA_ID"
                JOIN "BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID"
                WHERE cd."ACTIVA" = TRUE
                  AND c."ACTIVO" = TRUE
                  AND bh."ACTIVO" = TRUE
                  AND bh."TIPO_BLOQUE" = 'CLASE'
                ORDER BY
                    CASE bh."DIA_SEMANA"
                        WHEN 'LUNES' THEN 1
                        WHEN 'MARTES' THEN 2
                        WHEN 'MIERCOLES' THEN 3
                        WHEN 'JUEVES' THEN 4
                        WHEN 'VIERNES' THEN 5
                        ELSE 6
                    END,
                    bh."HORA_INICIO"
                """, (rs, rowNum) -> new CourseScheduleAssignment(
                rs.getLong("ID"),
                rs.getLong("course_id"),
                rs.getString("course_name"),
                rs.getString("teacher_name"),
                rs.getString("DIA_SEMANA"),
                formatTime(rs.getTime("HORA_INICIO").toLocalTime()),
                formatTime(rs.getTime("HORA_FIN").toLocalTime())
        ));
    }

    @Override
    public List<MasterCourse> search(String query) {
        String normalized = query == null ? "" : query.trim().toUpperCase();
        String[] tokens = normalized.isBlank() ? new String[0] : normalized.split("\\s+");

        if (!masterCourseNormalizationAvailable()) {
            return jdbcTemplate.query("""
                    SELECT "ID", "CODIGO", "DESCRIPCION"
                    FROM "CURSOS_MAESTROS"
                    WHERE "ACTIVO" = TRUE
                    ORDER BY "DESCRIPCION"
                    """, (rs, rowNum) -> legacyMasterCourse(rs.getLong("ID"), rs.getString("CODIGO"), rs.getString("DESCRIPCION")))
                    .stream().filter(item -> matchesTokens(item, tokens)).toList();
        }

        return jdbcTemplate.query("""
                SELECT
                    cm."ID",
                    cm."CODIGO",
                    COALESCE(cg."NOMBRE", cm."DESCRIPCION") AS "DESCRIPCION",
                    COALESCE(cn."NOMBRE", 'Sin nivel') AS level_name,
                    COALESCE(cg."CODIGO_TOKEN", REGEXP_REPLACE(UPPER(cm."CODIGO"), '^CUR-', '')) AS code_token,
                    COALESCE(cg."ORDEN", 999) AS sort_order
                FROM "CURSOS_MAESTROS" cm
                LEFT JOIN "CURSO_GRADOS" cg
                  ON cg."ID" = cm."GRADO_ID"
                LEFT JOIN "CURSO_NIVELES" cn
                  ON cn."ID" = cg."NIVEL_ID"
                WHERE cm."ACTIVO" = TRUE
                ORDER BY sort_order, "DESCRIPCION"
                """, (rs, rowNum) -> new MasterCourse(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("DESCRIPCION"),
                rs.getString("level_name"),
                rs.getString("code_token"),
                rs.getInt("sort_order")
        )).stream().filter(item -> matchesTokens(item, tokens)).toList();
    }

    @Override
    public Optional<MasterCourse> findById(Long masterCourseId) {
        if (!masterCourseNormalizationAvailable()) {
            return jdbcTemplate.query("""
                    SELECT "ID", "CODIGO", "DESCRIPCION"
                    FROM "CURSOS_MAESTROS"
                    WHERE "ID" = ?
                      AND "ACTIVO" = TRUE
                    """, (rs, rowNum) -> legacyMasterCourse(rs.getLong("ID"), rs.getString("CODIGO"), rs.getString("DESCRIPCION")), masterCourseId).stream().findFirst();
        }

        return jdbcTemplate.query("""
                SELECT
                    cm."ID",
                    cm."CODIGO",
                    COALESCE(cg."NOMBRE", cm."DESCRIPCION") AS "DESCRIPCION",
                    COALESCE(cn."NOMBRE", 'Sin nivel') AS level_name,
                    COALESCE(cg."CODIGO_TOKEN", REGEXP_REPLACE(UPPER(cm."CODIGO"), '^CUR-', '')) AS code_token,
                    COALESCE(cg."ORDEN", 999) AS sort_order
                FROM "CURSOS_MAESTROS" cm
                LEFT JOIN "CURSO_GRADOS" cg
                  ON cg."ID" = cm."GRADO_ID"
                LEFT JOIN "CURSO_NIVELES" cn
                  ON cn."ID" = cg."NIVEL_ID"
                WHERE cm."ID" = ?
                  AND cm."ACTIVO" = TRUE
                """, (rs, rowNum) -> new MasterCourse(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("DESCRIPCION"),
                rs.getString("level_name"),
                rs.getString("code_token"),
                rs.getInt("sort_order")
        ), masterCourseId).stream().findFirst();
    }

    @Override
    public List<TeacherCatalogItem> searchTeachers(String query) {
        String normalized = query == null ? "" : query.trim().toUpperCase();
        String[] tokens = normalized.isBlank() ? new String[0] : normalized.split("\\s+");

        return jdbcTemplate.query("""
                SELECT
                    p."ID",
                    COALESCE(NULLIF(TRIM(p."TIPO_PERSONAL"), ''), 'DOCENTE') AS staff_type,
                    pe."NOMBRES" AS "NOMBRE",
                    pe."RUN" AS "RUD",
                    pe."APELLIDOS" AS "APELLIDO",
                    pe."DIRECCION",
                    pe."REGION_ID",
                    pe."COMUNA_ID",
                    cr."NOMBRE" AS region_name,
                    cc."NOMBRE" AS commune_name,
                    pe."CORREO_ELECTRONICO" AS "EMAIL",
                    COALESCE(string_agg(DISTINCT teacher_subjects.subject_name, '|' ORDER BY teacher_subjects.subject_name), '') AS subjects
                FROM "PROFESORES" p
                JOIN "PERSONAS" pe
                  ON pe."ID" = p."PERSONA_ID"
                LEFT JOIN "CHILE_REGIONES" cr
                  ON cr."ID" = pe."REGION_ID"
                LEFT JOIN "CHILE_COMUNAS" cc
                  ON cc."ID" = pe."COMUNA_ID"
                LEFT JOIN (
                    %s
                ) teacher_subjects ON teacher_subjects.teacher_id = p."ID"
                WHERE p."ACTIVO" = TRUE
                GROUP BY p."ID", p."TIPO_PERSONAL", pe."NOMBRES", pe."RUN", pe."APELLIDOS", pe."DIRECCION", pe."REGION_ID", pe."COMUNA_ID", cr."NOMBRE", cc."NOMBRE", pe."CORREO_ELECTRONICO"
                ORDER BY pe."NOMBRES", pe."APELLIDOS"
                """.formatted(teacherSubjectsSubquery()), (rs, rowNum) -> new TeacherCatalogItem(
                rs.getLong("ID"),
                rs.getString("staff_type"),
                rs.getString("NOMBRE"),
                rs.getString("RUD"),
                rs.getString("APELLIDO"),
                rs.getString("DIRECCION"),
                (Long) rs.getObject("REGION_ID"),
                (Long) rs.getObject("COMUNA_ID"),
                rs.getString("region_name"),
                rs.getString("commune_name"),
                rs.getString("EMAIL"),
                splitSubjects(rs.getString("subjects"))
        )).stream().filter(item -> matchesTeacherTokens(item, tokens)).toList();
    }

    @Override
    public Optional<TeacherCatalogItem> findTeacherById(Long teacherId) {
        return jdbcTemplate.query("""
                SELECT
                    p."ID",
                    COALESCE(NULLIF(TRIM(p."TIPO_PERSONAL"), ''), 'DOCENTE') AS staff_type,
                    pe."NOMBRES" AS "NOMBRE",
                    pe."RUN" AS "RUD",
                    pe."APELLIDOS" AS "APELLIDO",
                    pe."DIRECCION",
                    pe."REGION_ID",
                    pe."COMUNA_ID",
                    cr."NOMBRE" AS region_name,
                    cc."NOMBRE" AS commune_name,
                    pe."CORREO_ELECTRONICO" AS "EMAIL",
                    COALESCE(string_agg(DISTINCT teacher_subjects.subject_name, '|' ORDER BY teacher_subjects.subject_name), '') AS subjects
                FROM "PROFESORES" p
                JOIN "PERSONAS" pe
                  ON pe."ID" = p."PERSONA_ID"
                LEFT JOIN "CHILE_REGIONES" cr
                  ON cr."ID" = pe."REGION_ID"
                LEFT JOIN "CHILE_COMUNAS" cc
                  ON cc."ID" = pe."COMUNA_ID"
                LEFT JOIN (
                    %s
                ) teacher_subjects ON teacher_subjects.teacher_id = p."ID"
                WHERE p."ID" = ?
                  AND p."ACTIVO" = TRUE
                GROUP BY p."ID", p."TIPO_PERSONAL", pe."NOMBRES", pe."RUN", pe."APELLIDOS", pe."DIRECCION", pe."REGION_ID", pe."COMUNA_ID", cr."NOMBRE", cc."NOMBRE", pe."CORREO_ELECTRONICO"
                """.formatted(teacherSubjectsSubquery()), (rs, rowNum) -> new TeacherCatalogItem(
                rs.getLong("ID"),
                rs.getString("staff_type"),
                rs.getString("NOMBRE"),
                rs.getString("RUD"),
                rs.getString("APELLIDO"),
                rs.getString("DIRECCION"),
                (Long) rs.getObject("REGION_ID"),
                (Long) rs.getObject("COMUNA_ID"),
                rs.getString("region_name"),
                rs.getString("commune_name"),
                rs.getString("EMAIL"),
                splitSubjects(rs.getString("subjects"))
        ), teacherId).stream().findFirst();
    }

    @Override
    public List<StudentCatalogItem> searchUnassignedStudents(String query) {
        String normalized = query == null ? "" : query.trim().toUpperCase();
        String[] tokens = normalized.isBlank() ? new String[0] : normalized.split("\\s+");

        return jdbcTemplate.query("""
                SELECT
                    a."ID",
                    a."RUN",
                    a."NOMBRE",
                    a."APELLIDOS",
                    a."DIRECCION",
                    a."REGION_ID",
                    a."COMUNA_ID",
                    cr."NOMBRE" AS region_name,
                    cc."NOMBRE" AS commune_name,
                    a."FECHA_NACIMIENTO"
                FROM "ALUMNOS" a
                LEFT JOIN "CHILE_REGIONES" cr
                  ON cr."ID" = a."REGION_ID"
                LEFT JOIN "CHILE_COMUNAS" cc
                  ON cc."ID" = a."COMUNA_ID"
                WHERE a."ACTIVO" = TRUE
                  AND a."ID" NOT IN (
                      SELECT "ALUMNO_ID"
                      FROM "MATRICULAS"
                      WHERE "ACTIVA" = TRUE
                  )
                ORDER BY a."NOMBRE", a."APELLIDOS"
                """, (rs, rowNum) -> mapStudent(rs.getLong("ID"),
                rs.getString("RUN"),
                rs.getString("NOMBRE"),
                rs.getString("APELLIDOS"),
                rs.getString("DIRECCION"),
                (Long) rs.getObject("REGION_ID"),
                (Long) rs.getObject("COMUNA_ID"),
                rs.getString("region_name"),
                rs.getString("commune_name"),
                rs.getDate("FECHA_NACIMIENTO").toLocalDate()
        )).stream().filter(item -> matchesStudentTokens(item, tokens)).toList();
    }

    @Override
    public Optional<StudentCatalogItem> findUnassignedStudentById(Long studentId) {
        return jdbcTemplate.query("""
                SELECT
                    a."ID",
                    a."RUN",
                    a."NOMBRE",
                    a."APELLIDOS",
                    a."DIRECCION",
                    a."REGION_ID",
                    a."COMUNA_ID",
                    cr."NOMBRE" AS region_name,
                    cc."NOMBRE" AS commune_name,
                    a."FECHA_NACIMIENTO"
                FROM "ALUMNOS" a
                LEFT JOIN "CHILE_REGIONES" cr
                  ON cr."ID" = a."REGION_ID"
                LEFT JOIN "CHILE_COMUNAS" cc
                  ON cc."ID" = a."COMUNA_ID"
                WHERE a."ID" = ?
                  AND a."ACTIVO" = TRUE
                  AND a."ID" NOT IN (
                      SELECT "ALUMNO_ID"
                      FROM "MATRICULAS"
                      WHERE "ACTIVA" = TRUE
                  )
                """, (rs, rowNum) -> mapStudent(rs.getLong("ID"),
                rs.getString("RUN"),
                rs.getString("NOMBRE"),
                rs.getString("APELLIDOS"),
                rs.getString("DIRECCION"),
                (Long) rs.getObject("REGION_ID"),
                (Long) rs.getObject("COMUNA_ID"),
                rs.getString("region_name"),
                rs.getString("commune_name"),
                rs.getDate("FECHA_NACIMIENTO").toLocalDate()
        ), studentId).stream().findFirst();
    }

    private String formatTime(LocalTime localTime) {
        return localTime.format(TIME_FORMATTER);
    }

    private boolean matchesTokens(MasterCourse item, String[] tokens) {
        if (tokens.length == 0) {
            return true;
        }

        String haystack = (item.code() + " " + item.description()).toUpperCase();
        for (String token : tokens) {
            if (!haystack.contains(token)) {
                return false;
            }
        }
        return true;
    }

    private boolean matchesTeacherTokens(TeacherCatalogItem item, String[] tokens) {
        if (tokens.length == 0) {
            return true;
        }

        String haystack = (
                item.firstName() + " " +
                item.lastName() + " " +
                item.rud() + " " +
                item.email() + " " +
                String.join(" ", item.subjects())
        ).toUpperCase();

        for (String token : tokens) {
            if (!haystack.contains(token)) {
                return false;
            }
        }
        return true;
    }

    private List<String> splitSubjects(String subjects) {
        if (subjects == null || subjects.isBlank()) {
            return List.of();
        }
        return List.of(subjects.split("\\|")).stream()
                .filter(value -> !value.isBlank())
                .collect(Collectors.toList());
    }

    private boolean matchesStudentTokens(StudentCatalogItem item, String[] tokens) {
        if (tokens.length == 0) {
            return true;
        }

        String haystack = (
                item.run() + " " +
                item.firstName() + " " +
                item.lastName() + " " +
                item.address()
        ).toUpperCase();

        for (String token : tokens) {
            if (!haystack.contains(token)) {
                return false;
            }
        }
        return true;
    }

    private StudentCatalogItem mapStudent(
            Long id,
            String run,
            String firstName,
            String lastName,
            String address,
            Long regionId,
            Long communeId,
            String regionName,
            String communeName,
            LocalDate birthDate
    ) {
        return new StudentCatalogItem(
                id,
                run,
                firstName,
                lastName,
                address,
                regionId,
                communeId,
                regionName,
                communeName,
                birthDate,
                Period.between(birthDate, LocalDate.now()).getYears()
        );
    }

    private void syncLegacyCourseStudent(Long courseId, Long studentId) {
        if (!tableExists("CURSO_ALUMNOS")) {
            return;
        }

        int updated = jdbcTemplate.update("""
                UPDATE "CURSO_ALUMNOS"
                SET "CURSO_ID" = ?,
                    "ACTIVO" = TRUE,
                    "FECHA_ASIGNACION" = COALESCE("FECHA_ASIGNACION", CURRENT_DATE)
                WHERE "ALUMNO_ID" = ?
                """, courseId, studentId);

        if (updated == 0) {
            jdbcTemplate.update("""
                    INSERT INTO "CURSO_ALUMNOS" ("CURSO_ID", "ALUMNO_ID", "FECHA_ASIGNACION", "ACTIVO")
                    VALUES (?, ?, CURRENT_DATE, TRUE)
                    """, courseId, studentId);
        }
    }

    private void ensureCourseSubjectsFromReference(Long courseId, Long gradeId) {
        if (!tableExists("CURSO_ASIGNATURAS")) {
            return;
        }

        Integer currentCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "CURSO_ASIGNATURAS"
                WHERE "CURSO_ID" = ?
                  AND "ACTIVA" = TRUE
                """, Integer.class, courseId);

        if (currentCount != null && currentCount > 0) {
            return;
        }

        Long resolvedGradeId = gradeId != null ? gradeId : jdbcTemplate.query("""
                SELECT "GRADO_ID"
                FROM "CURSOS"
                WHERE "ID" = ?
                """, (rs, rowNum) -> (Long) rs.getObject("GRADO_ID"), courseId).stream().findFirst().orElse(null);

        Long referenceCourseId = findReferenceCourseId(courseId, resolvedGradeId);
        if (referenceCourseId == null) {
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO "CURSO_ASIGNATURAS" ("CURSO_ID", "ASIGNATURA_ID", "ACTIVA")
                SELECT ?, source."ASIGNATURA_ID", TRUE
                FROM (
                    SELECT DISTINCT ca."ASIGNATURA_ID"
                    FROM "CURSO_ASIGNATURAS" ca
                    WHERE ca."CURSO_ID" = ?
                      AND ca."ACTIVA" = TRUE
                    UNION
                    SELECT DISTINCT cd."ASIGNATURA_ID"
                    FROM "CARGAS_DOCENTES" cd
                    WHERE cd."CURSO_ID" = ?
                      AND cd."ACTIVA" = TRUE
                ) source
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM "CURSO_ASIGNATURAS" target
                    WHERE target."CURSO_ID" = ?
                      AND target."ASIGNATURA_ID" = source."ASIGNATURA_ID"
                )
                """, courseId, referenceCourseId, referenceCourseId, courseId);
    }

    private Long findReferenceCourseId(Long courseId, Long gradeId) {
        if (gradeId != null) {
            List<Long> sameGrade = jdbcTemplate.query("""
                    SELECT c."ID"
                    FROM "CURSOS" c
                    WHERE c."ID" <> ?
                      AND c."ACTIVO" = TRUE
                      AND c."GRADO_ID" = ?
                      AND EXISTS (
                          SELECT 1
                          FROM "CURSO_ASIGNATURAS" ca
                          WHERE ca."CURSO_ID" = c."ID"
                            AND ca."ACTIVA" = TRUE
                      )
                    ORDER BY c."ANIO_ESCOLAR" DESC, c."ID"
                    LIMIT 1
                    """, (rs, rowNum) -> rs.getLong("ID"), courseId, gradeId);
            if (!sameGrade.isEmpty()) {
                return sameGrade.getFirst();
            }

            List<Long> nearestGrade = jdbcTemplate.query("""
                    SELECT c."ID"
                    FROM "CURSOS" c
                    WHERE c."ID" <> ?
                      AND c."ACTIVO" = TRUE
                      AND c."GRADO_ID" IS NOT NULL
                      AND EXISTS (
                          SELECT 1
                          FROM "CURSO_ASIGNATURAS" ca
                          WHERE ca."CURSO_ID" = c."ID"
                            AND ca."ACTIVA" = TRUE
                      )
                    ORDER BY ABS(c."GRADO_ID" - ?), c."ANIO_ESCOLAR" DESC, c."ID"
                    LIMIT 1
                    """, (rs, rowNum) -> rs.getLong("ID"), courseId, gradeId);
            if (!nearestGrade.isEmpty()) {
                return nearestGrade.getFirst();
            }
        }

        List<Long> anyReference = jdbcTemplate.query("""
                SELECT c."ID"
                FROM "CURSOS" c
                WHERE c."ID" <> ?
                  AND c."ACTIVO" = TRUE
                  AND EXISTS (
                      SELECT 1
                      FROM "CURSO_ASIGNATURAS" ca
                      WHERE ca."CURSO_ID" = c."ID"
                        AND ca."ACTIVA" = TRUE
                  )
                ORDER BY c."ANIO_ESCOLAR" DESC, c."ID"
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ID"), courseId);
        return anyReference.isEmpty() ? null : anyReference.getFirst();
    }

    private void ensureTeacherLoadsForCourse(Long courseId, Long teacherId) {
        if (teacherId == null || !tableExists("CARGAS_DOCENTES") || !tableExists("CURSO_ASIGNATURAS")) {
            return;
        }

        int effectiveSchoolYear = Optional.ofNullable(jdbcTemplate.queryForObject("""
                SELECT COALESCE("ANIO_ESCOLAR", EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
                FROM "CURSOS"
                WHERE "ID" = ?
                """, Integer.class, courseId)).orElse(LocalDate.now().getYear());

        List<Long> subjectIds = jdbcTemplate.query("""
                SELECT DISTINCT "ASIGNATURA_ID"
                FROM "CURSO_ASIGNATURAS"
                WHERE "CURSO_ID" = ?
                  AND "ACTIVA" = TRUE
                ORDER BY "ASIGNATURA_ID"
                """, (rs, rowNum) -> rs.getLong("ASIGNATURA_ID"), courseId);

        for (Long subjectId : subjectIds) {
            Integer suggestedHours = jdbcTemplate.queryForObject("""
                    SELECT COALESCE("HORAS_SUGERIDAS", 1)
                    FROM "ASIGNATURAS"
                    WHERE "ID" = ?
                    """, Integer.class, subjectId);
            int effectiveHours = suggestedHours == null ? 1 : suggestedHours;

            Long targetLoadId = jdbcTemplate.query("""
                    SELECT "ID"
                    FROM "CARGAS_DOCENTES"
                    WHERE "PROFESOR_ID" = ?
                      AND "CURSO_ID" = ?
                      AND "ASIGNATURA_ID" = ?
                      AND "ANIO_ESCOLAR" = ?
                    ORDER BY "ACTIVA" DESC, "ID"
                    LIMIT 1
                    """, (rs, rowNum) -> rs.getLong("ID"), teacherId, courseId, subjectId, effectiveSchoolYear)
                    .stream()
                    .findFirst()
                    .orElse(null);

            if (targetLoadId != null) {
                jdbcTemplate.update("""
                        UPDATE "CARGAS_DOCENTES"
                        SET "HORAS_SEMANALES" = ?,
                            "ACTIVA" = TRUE
                        WHERE "ID" = ?
                        """,
                        effectiveHours,
                        targetLoadId
                );
                jdbcTemplate.update("""
                        UPDATE "CARGAS_DOCENTES"
                        SET "ACTIVA" = FALSE
                        WHERE "CURSO_ID" = ?
                          AND "ASIGNATURA_ID" = ?
                          AND "ANIO_ESCOLAR" = ?
                          AND "ID" <> ?
                        """,
                        courseId,
                        subjectId,
                        effectiveSchoolYear,
                        targetLoadId
                );
                continue;
            }

            Long transferableLoadId = jdbcTemplate.query("""
                    SELECT "ID"
                    FROM "CARGAS_DOCENTES"
                    WHERE "CURSO_ID" = ?
                      AND "ASIGNATURA_ID" = ?
                      AND "ANIO_ESCOLAR" = ?
                    ORDER BY "ACTIVA" DESC, "ID"
                    LIMIT 1
                    """, (rs, rowNum) -> rs.getLong("ID"), courseId, subjectId, effectiveSchoolYear)
                    .stream()
                    .findFirst()
                    .orElse(null);

            if (transferableLoadId == null) {
                jdbcTemplate.update("""
                        INSERT INTO "CARGAS_DOCENTES" (
                            "PROFESOR_ID",
                            "CURSO_ID",
                            "ASIGNATURA_ID",
                            "ANIO_ESCOLAR",
                            "HORAS_SEMANALES",
                            "ES_PROFESOR_JEFE",
                            "ACTIVA"
                        )
                        VALUES (?, ?, ?, ?, ?, FALSE, TRUE)
                        """,
                        teacherId,
                        courseId,
                        subjectId,
                        effectiveSchoolYear,
                        effectiveHours
                );
                continue;
            }

            jdbcTemplate.update("""
                    UPDATE "CARGAS_DOCENTES"
                    SET "PROFESOR_ID" = ?,
                        "ANIO_ESCOLAR" = ?,
                        "HORAS_SEMANALES" = ?,
                        "ACTIVA" = TRUE
                    WHERE "ID" = ?
                    """,
                    teacherId,
                    effectiveSchoolYear,
                    effectiveHours,
                    transferableLoadId
            );
        }
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = ?
                """, Integer.class, tableName);
        return count != null && count > 0;
    }

    private String teacherSubjectsSubquery() {
        return """
                SELECT DISTINCT cd."PROFESOR_ID" AS teacher_id, a."NOMBRE" AS subject_name
                FROM "CARGAS_DOCENTES" cd
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                WHERE cd."ACTIVA" = TRUE
                  AND a."ACTIVA" = TRUE
                UNION
                SELECT DISTINCT pa."PROFESOR_ID" AS teacher_id, COALESCE(a."NOMBRE", pa."ASIGNATURA") AS subject_name
                FROM "PROFESOR_ASIGNATURAS" pa
                LEFT JOIN "ASIGNATURAS" a ON a."ID" = pa."ASIGNATURA_ID"
                WHERE pa."ACTIVO" = TRUE
                """;
    }

    private MasterCourse legacyMasterCourse(Long id, String code, String description) {
        String normalizedCode = code == null ? "" : code.trim().toUpperCase();
        return switch (normalizedCode) {
            case "CUR-PK" -> new MasterCourse(id, code, "Prekínder", "Inicial", "PK", 10);
            case "CUR-K" -> new MasterCourse(id, code, "Kínder", "Inicial", "K", 20);
            case "CUR-1B" -> new MasterCourse(id, code, "1 Básico", "Básico", "1", 30);
            case "CUR-2B" -> new MasterCourse(id, code, "2 Básico", "Básico", "2", 40);
            case "CUR-3B" -> new MasterCourse(id, code, "3 Básico", "Básico", "3", 50);
            case "CUR-4B" -> new MasterCourse(id, code, "4 Básico", "Básico", "4", 60);
            case "CUR-5B" -> new MasterCourse(id, code, "5 Básico", "Básico", "5", 70);
            case "CUR-6B" -> new MasterCourse(id, code, "6 Básico", "Básico", "6", 80);
            case "CUR-7B" -> new MasterCourse(id, code, "7 Básico", "Básico", "7", 90);
            case "CUR-8B" -> new MasterCourse(id, code, "8 Básico", "Básico", "8", 100);
            case "CUR-1M" -> new MasterCourse(id, code, "1 Medio", "Medio", "1M", 110);
            case "CUR-2M" -> new MasterCourse(id, code, "2 Medio", "Medio", "2M", 120);
            case "CUR-3M" -> new MasterCourse(id, code, "3 Medio", "Medio", "3M", 130);
            case "CUR-4M" -> new MasterCourse(id, code, "4 Medio", "Medio", "4M", 140);
            default -> new MasterCourse(id, code, description, inferLevelFromDescription(description), normalizedCode.replace("CUR-", ""), 999);
        };
    }

    private String inferLevelFromDescription(String description) {
        String normalized = normalizeText(description);
        if (normalized.contains("KINDER") || normalized.contains("NT1") || normalized.contains("NT2")) {
            return "Inicial";
        }
        if (normalized.contains("MEDIO")) {
            return "Medio";
        }
        return "Básico";
    }

    private boolean courseNormalizationAvailable() {
        return tableExists("CURSO_GRADOS")
                && tableExists("CURSO_NIVELES")
                && tableExists("CURSO_JORNADAS")
                && columnExists("CURSOS", "GRADO_ID")
                && columnExists("CURSOS", "JORNADA_ID");
    }

    private boolean masterCourseNormalizationAvailable() {
        return tableExists("CURSO_GRADOS")
                && tableExists("CURSO_NIVELES")
                && columnExists("CURSOS_MAESTROS", "GRADO_ID");
    }

    private Long resolveGradeId(String courseName) {
        if (courseName == null || courseName.isBlank() || !tableExists("CURSO_GRADOS")) {
            return null;
        }

        String normalizedCourseName = normalizeText(courseName);
        List<Long> ids = jdbcTemplate.query("""
                SELECT "ID"
                FROM "CURSO_GRADOS"
                WHERE UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = ?
                  AND "ACTIVO" = TRUE
                ORDER BY "ORDEN"
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ID"), normalizedCourseName);

        return ids.isEmpty() ? null : ids.getFirst();
    }

    private Long resolveScheduleId(String scheduleType) {
        if (scheduleType == null || scheduleType.isBlank() || !tableExists("CURSO_JORNADAS")) {
            return null;
        }

        String normalizedScheduleType = normalizeText(scheduleType);
        List<Long> ids = jdbcTemplate.query("""
                SELECT "ID"
                FROM "CURSO_JORNADAS"
                WHERE (
                    UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = ?
                    OR UPPER(TRANSLATE("CODIGO", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = ?
                )
                  AND "ACTIVO" = TRUE
                ORDER BY "ID"
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("ID"), normalizedScheduleType, normalizedScheduleType);

        return ids.isEmpty() ? null : ids.getFirst();
    }

    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = ?
                  AND column_name = ?
                """, Integer.class, tableName, columnName);
        return count != null && count > 0;
    }

    private String normalizeText(String value) {
        String sanitized = (value == null ? "" : value.trim())
                .replace("Ã¡", "á")
                .replace("Ã©", "é")
                .replace("Ã­", "í")
                .replace("Ã³", "ó")
                .replace("Ãº", "ú")
                .replace("Ã", "Á")
                .replace("Ã‰", "É")
                .replace("Ã", "Í")
                .replace("Ã“", "Ó")
                .replace("Ãš", "Ú")
                .replace("Ã±", "ñ")
                .replace("Ã‘", "Ñ");

        return Normalizer.normalize(sanitized, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toUpperCase();
    }

    private String normalizeGradeDisplayName(String value) {
        return switch (normalizeText(value)) {
            case "PREKINDER" -> "Prekínder";
            case "KINDER" -> "Kínder";
            case "1 BASICO" -> "1 Básico";
            case "2 BASICO" -> "2 Básico";
            case "3 BASICO" -> "3 Básico";
            case "4 BASICO" -> "4 Básico";
            case "5 BASICO" -> "5 Básico";
            case "6 BASICO" -> "6 Básico";
            case "7 BASICO" -> "7 Básico";
            case "8 BASICO" -> "8 Básico";
            case "1 MEDIO" -> "1 Medio";
            case "2 MEDIO" -> "2 Medio";
            case "3 MEDIO" -> "3 Medio";
            case "4 MEDIO" -> "4 Medio";
            default -> value == null ? "" : value.trim();
        };
    }

    private String normalizeLevelDisplayName(String value) {
        return switch (normalizeText(value)) {
            case "INICIAL" -> "Inicial";
            case "BASICO" -> "Básico";
            case "MEDIO" -> "Medio";
            default -> value == null ? "" : value.trim();
        };
    }

    private String normalizeScheduleDisplayName(String value) {
        return switch (normalizeText(value)) {
            case "MANANA" -> "Mañana";
            case "TARDE" -> "Tarde";
            case "COMPLETA" -> "Completa";
            default -> value == null ? "" : value.trim();
        };
    }

    private String buildArchivedCourseCode(String currentCode, Long courseId) {
        String baseCode = (currentCode == null || currentCode.isBlank())
                ? "CURSO"
                : currentCode.trim();
        String suffix = "__INACTIVO__" + courseId;

        if (baseCode.length() + suffix.length() <= 100) {
            return baseCode + suffix;
        }

        int maxBaseLength = Math.max(1, 100 - suffix.length());
        return baseCode.substring(0, Math.min(baseCode.length(), maxBaseLength)) + suffix;
    }
}
