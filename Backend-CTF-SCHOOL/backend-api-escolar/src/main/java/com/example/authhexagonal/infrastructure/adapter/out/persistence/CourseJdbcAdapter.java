package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.Course;
import com.example.authhexagonal.domain.model.CourseScheduleAssignment;
import com.example.authhexagonal.domain.model.MasterCourse;
import com.example.authhexagonal.domain.model.StudentCatalogItem;
import com.example.authhexagonal.domain.model.TeacherCatalogItem;
import com.example.authhexagonal.domain.port.out.LoadCourseSchedulePort;
import com.example.authhexagonal.domain.port.out.LoadMasterCoursesPort;
import com.example.authhexagonal.domain.port.out.ManageCoursesPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

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
    public List<Course> findAllActive() {
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
                    cd."ASISTENTE_ID" AS assistant_id,
                    c."ACTIVO",
                    COUNT(m."ID") AS student_count
                FROM "CURSOS"
                c
                LEFT JOIN "CURSO_DOCENTES" cd
                  ON cd."CURSO_ID" = c."ID"
                LEFT JOIN "MATRICULAS" m
                  ON m."CURSO_ID" = c."ID"
                 AND m."ACTIVA" = TRUE
                WHERE c."ACTIVO" = TRUE
                GROUP BY c."ID", c."CODIGO", c."NOMBRE", c."NIVEL", c."LETRA", c."ANIO_ESCOLAR", c."JORNADA", cd."PROFESOR_ID", cd."ASISTENTE_ID", c."ACTIVO"
                ORDER BY c."ANIO_ESCOLAR", c."NIVEL", c."LETRA"
                """, (rs, rowNum) -> new Course(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getString("NIVEL"),
                rs.getString("LETRA"),
                rs.getInt("ANIO_ESCOLAR"),
                rs.getString("JORNADA"),
                (Long) rs.getObject("teacher_id"),
                (Long) rs.getObject("assistant_id"),
                rs.getBoolean("ACTIVO"),
                rs.getInt("student_count")
        ));
    }

    @Override
    public Optional<Course> findActiveById(Long courseId) {
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
                    cd."ASISTENTE_ID" AS assistant_id,
                    c."ACTIVO",
                    COUNT(m."ID") AS student_count
                FROM "CURSOS" c
                LEFT JOIN "CURSO_DOCENTES" cd
                  ON cd."CURSO_ID" = c."ID"
                LEFT JOIN "MATRICULAS" m
                  ON m."CURSO_ID" = c."ID"
                 AND m."ACTIVA" = TRUE
                WHERE c."ID" = ?
                  AND c."ACTIVO" = TRUE
                GROUP BY c."ID", c."CODIGO", c."NOMBRE", c."NIVEL", c."LETRA", c."ANIO_ESCOLAR", c."JORNADA", cd."PROFESOR_ID", cd."ASISTENTE_ID", c."ACTIVO"
                """, (rs, rowNum) -> new Course(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getString("NIVEL"),
                rs.getString("LETRA"),
                rs.getInt("ANIO_ESCOLAR"),
                rs.getString("JORNADA"),
                (Long) rs.getObject("teacher_id"),
                (Long) rs.getObject("assistant_id"),
                rs.getBoolean("ACTIVO"),
                rs.getInt("student_count")
        ), courseId).stream().findFirst();
    }

    @Override
    public boolean existsActiveByCode(String code) {
        Integer exists = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "CURSOS"
                WHERE UPPER("CODIGO") = UPPER(?)
                  AND "ACTIVO" = TRUE
                """, Integer.class, code);
        return exists != null && exists > 0;
    }

    @Override
    public boolean existsActiveByCodeExcludingId(String code, Long courseId) {
        Integer exists = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "CURSOS"
                WHERE UPPER("CODIGO") = UPPER(?)
                  AND "ID" <> ?
                  AND "ACTIVO" = TRUE
                """, Integer.class, code, courseId);
        return exists != null && exists > 0;
    }

    @Override
    public Course create(String code, String name, String level, String letter, int schoolYear, String scheduleType) {
        Long id = jdbcTemplate.queryForObject("""
                INSERT INTO "CURSOS" ("CODIGO", "NOMBRE", "NIVEL", "LETRA", "ANIO_ESCOLAR", "JORNADA", "ACTIVO")
                VALUES (?, ?, ?, ?, ?, ?, TRUE)
                RETURNING "ID"
                """, Long.class, code, name, level, letter, schoolYear, scheduleType);

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
        jdbcTemplate.update("""
                UPDATE "CURSOS"
                SET "CODIGO" = ?,
                    "NOMBRE" = ?,
                    "NIVEL" = ?,
                    "LETRA" = ?,
                    "ANIO_ESCOLAR" = ?,
                    "JORNADA" = ?
                WHERE "ID" = ?
                """, code, name, level, letter, schoolYear, scheduleType, courseId);

        return findActiveById(courseId).orElseThrow();
    }

    @Override
    public void deactivate(Long courseId) {
        jdbcTemplate.update("""
                UPDATE "CURSOS"
                SET "ACTIVO" = FALSE
                WHERE "ID" = ?
                """, courseId);
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

        return jdbcTemplate.query("""
                SELECT "ID", "CODIGO", "DESCRIPCION"
                FROM "CURSOS_MAESTROS"
                WHERE "ACTIVO" = TRUE
                ORDER BY "DESCRIPCION"
                """, (rs, rowNum) -> new MasterCourse(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("DESCRIPCION")
        )).stream().filter(item -> matchesTokens(item, tokens)).toList();
    }

    @Override
    public Optional<MasterCourse> findById(Long masterCourseId) {
        return jdbcTemplate.query("""
                SELECT "ID", "CODIGO", "DESCRIPCION"
                FROM "CURSOS_MAESTROS"
                WHERE "ID" = ?
                  AND "ACTIVO" = TRUE
                """, (rs, rowNum) -> new MasterCourse(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("DESCRIPCION")
        ), masterCourseId).stream().findFirst();
    }

    @Override
    public List<TeacherCatalogItem> searchTeachers(String query) {
        String normalized = query == null ? "" : query.trim().toUpperCase();
        String[] tokens = normalized.isBlank() ? new String[0] : normalized.split("\\s+");

        return jdbcTemplate.query("""
                SELECT
                    p."ID",
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
                GROUP BY p."ID", pe."NOMBRES", pe."RUN", pe."APELLIDOS", pe."DIRECCION", pe."REGION_ID", pe."COMUNA_ID", cr."NOMBRE", cc."NOMBRE", pe."CORREO_ELECTRONICO"
                ORDER BY pe."NOMBRES", pe."APELLIDOS"
                """.formatted(teacherSubjectsSubquery()), (rs, rowNum) -> new TeacherCatalogItem(
                rs.getLong("ID"),
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
                GROUP BY p."ID", pe."NOMBRES", pe."RUN", pe."APELLIDOS", pe."DIRECCION", pe."REGION_ID", pe."COMUNA_ID", cr."NOMBRE", cc."NOMBRE", pe."CORREO_ELECTRONICO"
                """.formatted(teacherSubjectsSubquery()), (rs, rowNum) -> new TeacherCatalogItem(
                rs.getLong("ID"),
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
                WHERE "ACTIVO" = TRUE
                  AND "ID" NOT IN (
                      SELECT "ALUMNO_ID"
                      FROM "MATRICULAS"
                      WHERE "ACTIVA" = TRUE
                  )
                ORDER BY "NOMBRE", "APELLIDOS"
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
                WHERE "ID" = ?
                  AND "ACTIVO" = TRUE
                  AND "ID" NOT IN (
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
}
