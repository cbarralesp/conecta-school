package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.AcademicSubject;
import com.example.authhexagonal.domain.model.ScheduleBlock;
import com.example.authhexagonal.domain.model.ScheduleCourseOption;
import com.example.authhexagonal.domain.model.ScheduleEntry;
import com.example.authhexagonal.domain.model.SchedulePeriodOption;
import com.example.authhexagonal.domain.model.ScheduleTeacherOption;
import com.example.authhexagonal.domain.model.SubjectAssignedTeacher;
import com.example.authhexagonal.domain.port.out.ManageSchedulesPort;
import com.example.authhexagonal.domain.port.out.ManageSubjectsPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class AcademicManagementJdbcAdapter implements ManageSchedulesPort, ManageSubjectsPort {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final JdbcTemplate jdbcTemplate;

    public AcademicManagementJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<ScheduleEntry> findSchedulesByCourseId(Long courseId) {
        return findSchedulesByCourseIdAndPeriodId(courseId, null);
    }

    @Override
    public List<ScheduleEntry> findSchedulesByCourseIdAndPeriodId(Long courseId, Long periodId) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    hc."ID" AS schedule_id,
                    hc."CARGA_DOCENTE_ID" AS load_id,
                    p."ID" AS period_id,
                    p."NOMBRE" AS period_name,
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    pr."ID" AS teacher_id,
                    pr."CODIGO" AS teacher_code,
                    pe."NOMBRES" || ' ' || pe."APELLIDOS" AS teacher_name,
                    a."ID" AS subject_id,
                    a."CODIGO" AS subject_code,
                    a."NOMBRE" AS subject_name,
                    a."COLOR_HEX" AS subject_color_hex,
                    bh."ID" AS block_id,
                    bh."DIA_SEMANA" AS day_of_week,
                    bh."HORA_INICIO" AS start_time,
                    bh."HORA_FIN" AS end_time,
                    bh."ORDEN" AS block_order,
                    bh."TIPO_BLOQUE" AS block_type,
                    hc."SALA" AS room
                FROM "HORARIOS_CARGAS" hc
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = hc."CARGA_DOCENTE_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                LEFT JOIN "PERIODOS_ACADEMICOS" p ON p."ID" = cd."PERIODO_ID"
                JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                JOIN "PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID"
                WHERE c."ID" = ?
                  AND c."ACTIVO" = TRUE
                  AND cd."ACTIVA" = TRUE
                  AND a."ACTIVA" = TRUE
                  AND bh."ACTIVO" = TRUE
                """);

        List<Object> args = new ArrayList<>();
        args.add(courseId);
        if (periodId != null) {
            sql.append(" AND cd.\"PERIODO_ID\" = ?");
            args.add(periodId);
        }

        sql.append("""
                
                ORDER BY bh."ORDEN",
                    CASE bh."DIA_SEMANA"
                        WHEN 'LUNES' THEN 1
                        WHEN 'MARTES' THEN 2
                        WHEN 'MIERCOLES' THEN 3
                        WHEN 'JUEVES' THEN 4
                        WHEN 'VIERNES' THEN 5
                        ELSE 6
                    END
                """);

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapScheduleEntry(rs), args.toArray());
    }

    @Override
    public Optional<ScheduleEntry> findScheduleEntryById(Long scheduleId) {
        return jdbcTemplate.query("""
                SELECT
                    hc."ID" AS schedule_id,
                    hc."CARGA_DOCENTE_ID" AS load_id,
                    p."ID" AS period_id,
                    p."NOMBRE" AS period_name,
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    pr."ID" AS teacher_id,
                    pr."CODIGO" AS teacher_code,
                    pe."NOMBRES" || ' ' || pe."APELLIDOS" AS teacher_name,
                    a."ID" AS subject_id,
                    a."CODIGO" AS subject_code,
                    a."NOMBRE" AS subject_name,
                    a."COLOR_HEX" AS subject_color_hex,
                    bh."ID" AS block_id,
                    bh."DIA_SEMANA" AS day_of_week,
                    bh."HORA_INICIO" AS start_time,
                    bh."HORA_FIN" AS end_time,
                    bh."ORDEN" AS block_order,
                    bh."TIPO_BLOQUE" AS block_type,
                    hc."SALA" AS room
                FROM "HORARIOS_CARGAS" hc
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = hc."CARGA_DOCENTE_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                LEFT JOIN "PERIODOS_ACADEMICOS" p ON p."ID" = cd."PERIODO_ID"
                JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                JOIN "PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID"
                WHERE hc."ID" = ?
                """, (rs, rowNum) -> mapScheduleEntry(rs), scheduleId).stream().findFirst();
    }

    @Override
    public List<ScheduleCourseOption> findActiveScheduleCourses() {
        return jdbcTemplate.query("""
                SELECT
                    "ID",
                    "CODIGO",
                    CASE
                        WHEN COALESCE(BTRIM("LETRA"), '') = '' THEN "NOMBRE"
                        WHEN RIGHT(BTRIM("NOMBRE"), LENGTH(BTRIM("LETRA"))) = BTRIM("LETRA") THEN "NOMBRE"
                        ELSE "NOMBRE" || ' ' || "LETRA"
                    END AS "NOMBRE",
                    "ANIO_ESCOLAR",
                    "JORNADA"
                FROM "CURSOS"
                WHERE "ACTIVO" = TRUE
                ORDER BY "ANIO_ESCOLAR" DESC, "NOMBRE", "LETRA"
                """, (rs, rowNum) -> new ScheduleCourseOption(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getInt("ANIO_ESCOLAR"),
                rs.getString("JORNADA")
        ));
    }

    @Override
    public List<SchedulePeriodOption> findActiveSchedulePeriods() {
        return jdbcTemplate.query("""
                SELECT "ID", "NOMBRE", "ANIO", "SEMESTRE"
                FROM "PERIODOS_ACADEMICOS"
                WHERE "ACTIVO" = TRUE
                ORDER BY "ANIO" DESC, "SEMESTRE" ASC
                """, (rs, rowNum) -> new SchedulePeriodOption(
                rs.getLong("ID"),
                rs.getString("NOMBRE"),
                rs.getInt("ANIO"),
                rs.getInt("SEMESTRE")
        ));
    }

    @Override
    public Optional<SchedulePeriodOption> findActiveSchedulePeriodById(Long periodId) {
        return jdbcTemplate.query("""
                SELECT "ID", "NOMBRE", "ANIO", "SEMESTRE"
                FROM "PERIODOS_ACADEMICOS"
                WHERE "ID" = ?
                  AND "ACTIVO" = TRUE
                """, (rs, rowNum) -> new SchedulePeriodOption(
                rs.getLong("ID"),
                rs.getString("NOMBRE"),
                rs.getInt("ANIO"),
                rs.getInt("SEMESTRE")
        ), periodId).stream().findFirst();
    }

    @Override
    public Optional<ScheduleCourseOption> findActiveScheduleCourseById(Long courseId) {
        return jdbcTemplate.query("""
                SELECT
                    "ID",
                    "CODIGO",
                    CASE
                        WHEN COALESCE(BTRIM("LETRA"), '') = '' THEN "NOMBRE"
                        WHEN RIGHT(BTRIM("NOMBRE"), LENGTH(BTRIM("LETRA"))) = BTRIM("LETRA") THEN "NOMBRE"
                        ELSE "NOMBRE" || ' ' || "LETRA"
                    END AS "NOMBRE",
                    "ANIO_ESCOLAR",
                    "JORNADA"
                FROM "CURSOS"
                WHERE "ID" = ?
                  AND "ACTIVO" = TRUE
                """, (rs, rowNum) -> new ScheduleCourseOption(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getInt("ANIO_ESCOLAR"),
                rs.getString("JORNADA")
        ), courseId).stream().findFirst();
    }

    @Override
    public List<ScheduleTeacherOption> findActiveScheduleTeachers() {
        return jdbcTemplate.query("""
                SELECT
                    pr."ID",
                    pr."CODIGO",
                    pr."ESPECIALIDAD",
                    pe."NOMBRES" || ' ' || pe."APELLIDOS" AS full_name
                FROM "PROFESORES" pr
                JOIN "PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
                WHERE pr."ACTIVO" = TRUE
                ORDER BY pe."NOMBRES", pe."APELLIDOS"
                """, (rs, rowNum) -> new ScheduleTeacherOption(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("full_name"),
                rs.getString("ESPECIALIDAD")
        ));
    }

    @Override
    public Optional<ScheduleTeacherOption> findActiveScheduleTeacherById(Long teacherId) {
        return jdbcTemplate.query("""
                SELECT
                    pr."ID",
                    pr."CODIGO",
                    pr."ESPECIALIDAD",
                    pe."NOMBRES" || ' ' || pe."APELLIDOS" AS full_name
                FROM "PROFESORES" pr
                JOIN "PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
                WHERE pr."ID" = ?
                  AND pr."ACTIVO" = TRUE
                """, (rs, rowNum) -> new ScheduleTeacherOption(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("full_name"),
                rs.getString("ESPECIALIDAD")
        ), teacherId).stream().findFirst();
    }

    @Override
    public List<AcademicSubject> findAvailableScheduleSubjects() {
        return findAllActiveSubjects(null, null);
    }

    @Override
    public Optional<AcademicSubject> findAvailableScheduleSubjectById(Long subjectId) {
        return findActiveSubjectById(subjectId);
    }

    @Override
    public List<ScheduleBlock> findWeeklyScheduleBlocks(Long courseId) {
        if (!scheduleCourseScopeAvailable()) {
            return jdbcTemplate.query("""
                    SELECT "ID", "DIA_SEMANA", "HORA_INICIO", "HORA_FIN", "ORDEN", "TIPO_BLOQUE"
                    FROM "BLOQUES_HORARIOS"
                    WHERE "ACTIVO" = TRUE
                    ORDER BY "ORDEN",
                        CASE "DIA_SEMANA"
                            WHEN 'LUNES' THEN 1
                            WHEN 'MARTES' THEN 2
                            WHEN 'MIERCOLES' THEN 3
                            WHEN 'JUEVES' THEN 4
                            WHEN 'VIERNES' THEN 5
                            ELSE 6
                        END
                    """, (rs, rowNum) -> mapBlock(rs));
        }

        boolean hasScopedBlocks = hasCourseSpecificBlocks(courseId);
        String scopeCondition = hasScopedBlocks ? "\"CURSO_ID\" = ?" : "\"CURSO_ID\" IS NULL";
        List<Object> args = hasScopedBlocks ? List.of(courseId) : List.of();
        return jdbcTemplate.query("""
                SELECT "ID", "DIA_SEMANA", "HORA_INICIO", "HORA_FIN", "ORDEN", "TIPO_BLOQUE"
                FROM "BLOQUES_HORARIOS"
                WHERE "ACTIVO" = TRUE
                  AND %s
                ORDER BY "ORDEN",
                    CASE "DIA_SEMANA"
                        WHEN 'LUNES' THEN 1
                        WHEN 'MARTES' THEN 2
                        WHEN 'MIERCOLES' THEN 3
                        WHEN 'JUEVES' THEN 4
                        WHEN 'VIERNES' THEN 5
                        ELSE 6
                    END
                """.formatted(scopeCondition), (rs, rowNum) -> mapBlock(rs), args.toArray());
    }

    @Override
    public int findMaxScheduleBlockOrder() {
        Integer maxOrder = jdbcTemplate.queryForObject("""
                SELECT COALESCE(MAX("ORDEN"), 0)
                FROM "BLOQUES_HORARIOS"
                """, Integer.class);
        return maxOrder == null ? 0 : maxOrder;
    }

    @Override
    public void shiftScheduleBlockOrdersFrom(Long courseId, int order) {
        if (!scheduleCourseScopeAvailable()) {
            jdbcTemplate.update("""
                    UPDATE "BLOQUES_HORARIOS"
                    SET "ORDEN" = -"ORDEN"
                    WHERE "ORDEN" >= ?
                    """, order);

            jdbcTemplate.update("""
                    UPDATE "BLOQUES_HORARIOS"
                    SET "ORDEN" = ABS("ORDEN") + 1
                    WHERE "ORDEN" <= -?
                    """, order);
            return;
        }

        jdbcTemplate.update("""
                UPDATE "BLOQUES_HORARIOS"
                SET "ORDEN" = -"ORDEN"
                WHERE "ORDEN" >= ?
                  AND "CURSO_ID" = ?
                """, order, courseId);

        jdbcTemplate.update("""
                UPDATE "BLOQUES_HORARIOS"
                SET "ORDEN" = ABS("ORDEN") + 1
                WHERE "ORDEN" <= -?
                  AND "CURSO_ID" = ?
                """, order, courseId);
    }

    @Override
    public Optional<ScheduleBlock> findActiveScheduleBlockById(Long blockId) {
        return jdbcTemplate.query("""
                SELECT "ID", "DIA_SEMANA", "HORA_INICIO", "HORA_FIN", "ORDEN", "TIPO_BLOQUE"
                FROM "BLOQUES_HORARIOS"
                WHERE "ID" = ?
                  AND "ACTIVO" = TRUE
                """, (rs, rowNum) -> mapBlock(rs), blockId).stream().findFirst();
    }

    @Override
    public List<ScheduleBlock> findActiveScheduleBlocksByOrder(Long courseId, int order) {
        if (!scheduleCourseScopeAvailable()) {
            return jdbcTemplate.query("""
                    SELECT "ID", "DIA_SEMANA", "HORA_INICIO", "HORA_FIN", "ORDEN", "TIPO_BLOQUE"
                    FROM "BLOQUES_HORARIOS"
                    WHERE "ORDEN" = ?
                      AND "ACTIVO" = TRUE
                    ORDER BY CASE "DIA_SEMANA"
                        WHEN 'LUNES' THEN 1
                        WHEN 'MARTES' THEN 2
                        WHEN 'MIERCOLES' THEN 3
                        WHEN 'JUEVES' THEN 4
                        WHEN 'VIERNES' THEN 5
                        ELSE 6
                    END
                    """, (rs, rowNum) -> mapBlock(rs), order);
        }

        boolean hasScopedBlocks = hasCourseSpecificBlocks(courseId);
        String scopeCondition = hasScopedBlocks ? "\"CURSO_ID\" = ?" : "\"CURSO_ID\" IS NULL";
        List<Object> args = new ArrayList<>();
        args.add(order);
        if (hasScopedBlocks) {
            args.add(courseId);
        }
        return jdbcTemplate.query("""
                SELECT "ID", "DIA_SEMANA", "HORA_INICIO", "HORA_FIN", "ORDEN", "TIPO_BLOQUE"
                FROM "BLOQUES_HORARIOS"
                WHERE "ORDEN" = ?
                  AND "ACTIVO" = TRUE
                  AND %s
                ORDER BY CASE "DIA_SEMANA"
                    WHEN 'LUNES' THEN 1
                    WHEN 'MARTES' THEN 2
                    WHEN 'MIERCOLES' THEN 3
                    WHEN 'JUEVES' THEN 4
                    WHEN 'VIERNES' THEN 5
                    ELSE 6
                END
                """.formatted(scopeCondition), (rs, rowNum) -> mapBlock(rs), args.toArray());
    }

    @Override
    public boolean hasCourseConflict(Long courseId, Long periodId, Long blockId, Long excludeScheduleId) {
        Integer count;
        if (excludeScheduleId == null) {
            count = jdbcTemplate.queryForObject("""
                    SELECT COUNT(1)
                    FROM "HORARIOS_CARGAS" hc
                    JOIN "CARGAS_DOCENTES" cd ON cd."ID" = hc."CARGA_DOCENTE_ID"
                    JOIN "BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID"
                    WHERE cd."CURSO_ID" = ?
                      AND cd."PERIODO_ID" = ?
                      AND hc."BLOQUE_HORARIO_ID" = ?
                      AND cd."ACTIVA" = TRUE
                      AND bh."ACTIVO" = TRUE
                    """, Integer.class, courseId, periodId, blockId);
        } else {
            count = jdbcTemplate.queryForObject("""
                    SELECT COUNT(1)
                    FROM "HORARIOS_CARGAS" hc
                    JOIN "CARGAS_DOCENTES" cd ON cd."ID" = hc."CARGA_DOCENTE_ID"
                    JOIN "BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID"
                    WHERE cd."CURSO_ID" = ?
                      AND cd."PERIODO_ID" = ?
                      AND hc."BLOQUE_HORARIO_ID" = ?
                      AND cd."ACTIVA" = TRUE
                      AND bh."ACTIVO" = TRUE
                      AND hc."ID" <> ?
                    """, Integer.class, courseId, periodId, blockId, excludeScheduleId);
        }
        return count != null && count > 0;
    }

    @Override
    public boolean hasTeacherConflict(Long teacherId, Long periodId, Long blockId, Long excludeScheduleId) {
        Integer count;
        if (excludeScheduleId == null) {
            count = jdbcTemplate.queryForObject("""
                    SELECT COUNT(1)
                    FROM "HORARIOS_CARGAS" hc
                    JOIN "CARGAS_DOCENTES" cd ON cd."ID" = hc."CARGA_DOCENTE_ID"
                    WHERE cd."PROFESOR_ID" = ?
                      AND cd."PERIODO_ID" = ?
                      AND hc."BLOQUE_HORARIO_ID" = ?
                      AND cd."ACTIVA" = TRUE
                    """, Integer.class, teacherId, periodId, blockId);
        } else {
            count = jdbcTemplate.queryForObject("""
                    SELECT COUNT(1)
                    FROM "HORARIOS_CARGAS" hc
                    JOIN "CARGAS_DOCENTES" cd ON cd."ID" = hc."CARGA_DOCENTE_ID"
                    WHERE cd."PROFESOR_ID" = ?
                      AND cd."PERIODO_ID" = ?
                      AND hc."BLOQUE_HORARIO_ID" = ?
                      AND cd."ACTIVA" = TRUE
                      AND hc."ID" <> ?
                    """, Integer.class, teacherId, periodId, blockId, excludeScheduleId);
        }
        return count != null && count > 0;
    }

    @Override
    public Long findOrCreateTeachingLoad(Long teacherId, Long courseId, Long subjectId, int schoolYear, Long periodId) {
        List<Long> ids = jdbcTemplate.query("""
                SELECT "ID"
                FROM "CARGAS_DOCENTES"
                WHERE "PROFESOR_ID" = ?
                  AND "CURSO_ID" = ?
                  AND "ASIGNATURA_ID" = ?
                  AND "ANIO_ESCOLAR" = ?
                  AND "PERIODO_ID" = ?
                """, (rs, rowNum) -> rs.getLong("ID"), teacherId, courseId, subjectId, schoolYear, periodId);

        if (!ids.isEmpty()) {
            Long loadId = ids.getFirst();
            jdbcTemplate.update("""
                    UPDATE "CARGAS_DOCENTES"
                    SET "ACTIVA" = TRUE
                    WHERE "ID" = ?
                    """, loadId);
            return loadId;
        }

        syncSequence("CARGAS_DOCENTES", "ID");
        return jdbcTemplate.queryForObject("""
                INSERT INTO "CARGAS_DOCENTES" (
                    "PROFESOR_ID",
                    "CURSO_ID",
                    "ASIGNATURA_ID",
                    "PERIODO_ID",
                    "ANIO_ESCOLAR",
                    "HORAS_SEMANALES",
                    "ES_PROFESOR_JEFE",
                    "ACTIVA"
                )
                VALUES (?, ?, ?, ?, ?, 0, FALSE, TRUE)
                RETURNING "ID"
                """, Long.class, teacherId, courseId, subjectId, periodId, schoolYear);
    }

    @Override
    public ScheduleEntry createScheduleEntry(Long loadId, Long blockId, String room) {
        Long scheduleId = jdbcTemplate.queryForObject("""
                INSERT INTO "HORARIOS_CARGAS" ("CARGA_DOCENTE_ID", "BLOQUE_HORARIO_ID", "SALA")
                VALUES (?, ?, ?)
                RETURNING "ID"
                """, Long.class, loadId, blockId, room);

        return findScheduleEntryById(scheduleId).orElseThrow();
    }

    @Override
    public ScheduleEntry updateScheduleEntry(Long scheduleId, Long loadId, Long blockId, String room) {
        jdbcTemplate.update("""
                UPDATE "HORARIOS_CARGAS"
                SET "CARGA_DOCENTE_ID" = ?,
                    "BLOQUE_HORARIO_ID" = ?,
                    "SALA" = ?
                WHERE "ID" = ?
                """, loadId, blockId, room, scheduleId);

        return findScheduleEntryById(scheduleId).orElseThrow();
    }

    @Override
    public void deleteScheduleEntry(Long scheduleId) {
        jdbcTemplate.update("""
                DELETE FROM "HORARIOS_CARGAS"
                WHERE "ID" = ?
                """, scheduleId);
    }

    @Override
    public void updateScheduleBlocksTimeByOrder(Long courseId, int order, String startTime, String endTime) {
        if (!scheduleCourseScopeAvailable()) {
            jdbcTemplate.update("""
                    UPDATE "BLOQUES_HORARIOS"
                    SET "HORA_INICIO" = CAST(? AS TIME),
                        "HORA_FIN" = CAST(? AS TIME)
                    WHERE "ORDEN" = ?
                      AND "ACTIVO" = TRUE
                    """, startTime, endTime, order);
            return;
        }

        jdbcTemplate.update("""
                UPDATE "BLOQUES_HORARIOS"
                SET "HORA_INICIO" = CAST(? AS TIME),
                    "HORA_FIN" = CAST(? AS TIME)
                WHERE "ORDEN" = ?
                  AND "ACTIVO" = TRUE
                  AND "CURSO_ID" = ?
                """, startTime, endTime, order, courseId);
    }

    @Override
    public void createBreakBlocks(Long courseId, String startTime, String endTime, int order) {
        createScheduleBlocks(courseId, startTime, endTime, order, "RECREO");
    }

    @Override
    public void createScheduleBlocks(Long courseId, String startTime, String endTime, int order, String blockType) {
        List<String> weekdays = List.of("LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES");
        if (!scheduleCourseScopeAvailable()) {
            for (String weekday : weekdays) {
                jdbcTemplate.update("""
                        INSERT INTO "BLOQUES_HORARIOS" (
                            "DIA_SEMANA",
                            "HORA_INICIO",
                            "HORA_FIN",
                            "ORDEN",
                            "TIPO_BLOQUE",
                            "ACTIVO"
                        )
                        VALUES (?, CAST(? AS TIME), CAST(? AS TIME), ?, ?, TRUE)
                        """, weekday, startTime, endTime, order, blockType);
            }
            return;
        }

        for (String weekday : weekdays) {
            jdbcTemplate.update("""
                    INSERT INTO "BLOQUES_HORARIOS" (
                        "DIA_SEMANA",
                        "HORA_INICIO",
                        "HORA_FIN",
                        "ORDEN",
                        "TIPO_BLOQUE",
                        "CURSO_ID",
                        "ACTIVO"
                    )
                    VALUES (?, CAST(? AS TIME), CAST(? AS TIME), ?, ?, ?, TRUE)
                    """, weekday, startTime, endTime, order, blockType, courseId);
        }
    }

    @Override
    public void deactivateScheduleBlocksByOrder(Long courseId, int order) {
        if (!scheduleCourseScopeAvailable()) {
            jdbcTemplate.update("""
                    UPDATE "BLOQUES_HORARIOS"
                    SET "ACTIVO" = FALSE
                    WHERE "ORDEN" = ?
                    """, order);
            return;
        }

        jdbcTemplate.update("""
                UPDATE "BLOQUES_HORARIOS"
                SET "ACTIVO" = FALSE
                WHERE "ORDEN" = ?
                  AND "CURSO_ID" = ?
                """, order, courseId);
    }

    @Override
    public boolean hasScheduleEntriesForOrder(Long courseId, int order) {
        if (!scheduleCourseScopeAvailable()) {
            Integer count = jdbcTemplate.queryForObject("""
                    SELECT COUNT(1)
                    FROM "HORARIOS_CARGAS" hc
                    JOIN "BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID"
                    WHERE bh."ORDEN" = ?
                      AND bh."ACTIVO" = TRUE
                    """, Integer.class, order);
            return count != null && count > 0;
        }

        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "HORARIOS_CARGAS" hc
                JOIN "BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID"
                WHERE bh."ORDEN" = ?
                  AND bh."ACTIVO" = TRUE
                  AND bh."CURSO_ID" = ?
                """, Integer.class, order, courseId);
        return count != null && count > 0;
    }

    @Override
    public void ensureCourseSpecificScheduleBlocks(Long courseId) {
        if (!scheduleCourseScopeAvailable()) {
            return;
        }

        if (courseId == null || hasCourseSpecificBlocks(courseId)) {
            return;
        }

        jdbcTemplate.update("""
                INSERT INTO "BLOQUES_HORARIOS" (
                    "DIA_SEMANA",
                    "HORA_INICIO",
                    "HORA_FIN",
                    "ORDEN",
                    "TIPO_BLOQUE",
                    "CURSO_ID",
                    "ACTIVO"
                )
                SELECT
                    "DIA_SEMANA",
                    "HORA_INICIO",
                    "HORA_FIN",
                    "ORDEN",
                    "TIPO_BLOQUE",
                    ?,
                    "ACTIVO"
                FROM "BLOQUES_HORARIOS"
                WHERE "CURSO_ID" IS NULL
                  AND "ACTIVO" = TRUE
                """, courseId);

        jdbcTemplate.update("""
                UPDATE "HORARIOS_CARGAS" hc
                SET "BLOQUE_HORARIO_ID" = scoped."ID"
                FROM "CARGAS_DOCENTES" cd,
                     "BLOQUES_HORARIOS" original,
                     "BLOQUES_HORARIOS" scoped
                WHERE cd."ID" = hc."CARGA_DOCENTE_ID"
                  AND cd."CURSO_ID" = ?
                  AND original."ID" = hc."BLOQUE_HORARIO_ID"
                  AND original."CURSO_ID" IS NULL
                  AND scoped."CURSO_ID" = cd."CURSO_ID"
                  AND scoped."DIA_SEMANA" = original."DIA_SEMANA"
                  AND scoped."ORDEN" = original."ORDEN"
                """, courseId);
    }

    private boolean hasCourseSpecificBlocks(Long courseId) {
        if (!scheduleCourseScopeAvailable()) {
            return false;
        }
        if (courseId == null) {
            return false;
        }
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "BLOQUES_HORARIOS"
                WHERE "CURSO_ID" = ?
                  AND "ACTIVO" = TRUE
                """, Integer.class, courseId);
        return count != null && count > 0;
    }

    @Override
    public void syncWeeklyHours(Long loadId) {
        jdbcTemplate.update("""
                UPDATE "CARGAS_DOCENTES"
                SET "HORAS_SEMANALES" = (
                    SELECT COUNT(1)
                    FROM "HORARIOS_CARGAS" hc
                    JOIN "BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID"
                    WHERE hc."CARGA_DOCENTE_ID" = "CARGAS_DOCENTES"."ID"
                      AND bh."TIPO_BLOQUE" = 'CLASE'
                )
                WHERE "ID" = ?
                """, loadId);
    }

    @Override
    public List<AcademicSubject> findAllActiveSubjects(String search, String levelGroup) {
        String displayLevelExpression = subjectDisplayLevelExpression("a");
        StringBuilder sql = new StringBuilder("""
                SELECT
                    a."ID",
                    a."CODIGO",
                    a."NOMBRE",
                    a."AREA",
                    a."COLOR_HEX",
                    COALESCE(a."DESCRIPCION", '') AS "DESCRIPCION",
                    COALESCE(a."NIVEL_REFERENCIA", '') AS "NIVEL_REFERENCIA",
                    COALESCE(NULLIF(TRIM(a."TIPO_EVALUACION"), ''), 'NUMERICA') AS "TIPO_EVALUACION",
                    %s AS "DISPLAY_LEVEL",
                    COALESCE(a."HORAS_SUGERIDAS", 2) AS "HORAS_SUGERIDAS",
                    a."ACTIVA"
                FROM "ASIGNATURAS" a
                """.formatted(displayLevelExpression));
        appendSubjectLevelJoin(sql);
        sql.append("""
                WHERE a."ACTIVA" = TRUE
                """);

        List<Object> args = new java.util.ArrayList<>();
        if (search != null && !search.isBlank()) {
            sql.append("""
                     AND (
                        UPPER(a."CODIGO") LIKE UPPER(?)
                        OR UPPER(a."NOMBRE") LIKE UPPER(?)
                        OR UPPER(a."AREA") LIKE UPPER(?)
                        OR UPPER(%s) LIKE UPPER(?)
                        OR UPPER(COALESCE(a."NIVEL_REFERENCIA", '')) LIKE UPPER(?)
                        OR UPPER(COALESCE(a."DESCRIPCION", '')) LIKE UPPER(?)
                    )
                    """.formatted(displayLevelExpression));
            String pattern = "%" + search.trim() + "%";
            args.add(pattern);
            args.add(pattern);
            args.add(pattern);
            args.add(pattern);
            args.add(pattern);
            args.add(pattern);
        }

        String normalizedDisplayLevelExpression = normalizedSubjectLevelExpression(displayLevelExpression);
        if ("initial".equalsIgnoreCase(levelGroup)) {
            sql.append(" AND ").append(normalizedDisplayLevelExpression).append(" LIKE '%INICIAL%'");
        } else if ("basic".equalsIgnoreCase(levelGroup)) {
            sql.append(" AND ").append(normalizedDisplayLevelExpression).append(" LIKE '%BASICO%'");
        } else if ("media".equalsIgnoreCase(levelGroup)) {
            sql.append(" AND ").append(normalizedDisplayLevelExpression).append(" LIKE '%MEDIA%'");
        }

        sql.append(" ORDER BY a.\"NOMBRE\"");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapSubject(rs), args.toArray());
    }

    @Override
    public Optional<AcademicSubject> findActiveSubjectById(Long subjectId) {
        String displayLevelExpression = subjectDisplayLevelExpression("a");
        StringBuilder sql = new StringBuilder("""
                SELECT
                    a."ID",
                    a."CODIGO",
                    a."NOMBRE",
                    a."AREA",
                    a."COLOR_HEX",
                    COALESCE(a."DESCRIPCION", '') AS "DESCRIPCION",
                    COALESCE(a."NIVEL_REFERENCIA", '') AS "NIVEL_REFERENCIA",
                    COALESCE(NULLIF(TRIM(a."TIPO_EVALUACION"), ''), 'NUMERICA') AS "TIPO_EVALUACION",
                    %s AS "DISPLAY_LEVEL",
                    COALESCE(a."HORAS_SUGERIDAS", 2) AS "HORAS_SUGERIDAS",
                    a."ACTIVA"
                FROM "ASIGNATURAS" a
                """.formatted(displayLevelExpression));
        appendSubjectLevelJoin(sql);
        sql.append("""
                WHERE a."ID" = ?
                  AND a."ACTIVA" = TRUE
                """);
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapSubject(rs), subjectId).stream().findFirst();
    }

    @Override
    public boolean existsActiveSubjectByCode(String code) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "ASIGNATURAS"
                WHERE UPPER("CODIGO") = UPPER(?)
                  AND "ACTIVA" = TRUE
                """, Integer.class, code);
        return count != null && count > 0;
    }

    @Override
    public boolean existsActiveSubjectByCodeExcludingId(String code, Long subjectId) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "ASIGNATURAS"
                WHERE UPPER("CODIGO") = UPPER(?)
                  AND "ID" <> ?
                  AND "ACTIVA" = TRUE
                """, Integer.class, code, subjectId);
        return count != null && count > 0;
    }

    @Override
    public AcademicSubject createSubject(
            String code,
            String name,
            String area,
            String colorHex,
            String description,
            String referenceLevel,
            String evaluationType,
            int suggestedHours,
            List<Long> teacherIds,
            List<Long> applicableGradeIds,
            List<Long> applicableCourseIds
    ) {
        Long subjectId = jdbcTemplate.queryForObject("""
                INSERT INTO "ASIGNATURAS" (
                    "CODIGO",
                    "NOMBRE",
                    "AREA",
                    "COLOR_HEX",
                    "DESCRIPCION",
                    "NIVEL_REFERENCIA",
                    "TIPO_EVALUACION",
                    "HORAS_SUGERIDAS",
                    "ACTIVA"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                RETURNING "ID"
                """, Long.class, code, name, area, colorHex, description, referenceLevel, evaluationType, suggestedHours);

        replaceSubjectApplicableGrades(subjectId, applicableGradeIds);
        replaceSubjectApplicableCourses(subjectId, referenceLevel, applicableCourseIds);
        replaceSubjectTeachers(subjectId, name, null, teacherIds);
        return findActiveSubjectById(subjectId).orElseThrow();
    }

    @Override
    public AcademicSubject updateSubject(
            Long subjectId,
            String code,
            String name,
            String area,
            String colorHex,
            String description,
            String referenceLevel,
            String evaluationType,
            int suggestedHours,
            List<Long> teacherIds,
            List<Long> applicableGradeIds,
            List<Long> applicableCourseIds
    ) {
        String previousName = jdbcTemplate.queryForObject("""
                SELECT "NOMBRE"
                FROM "ASIGNATURAS"
                WHERE "ID" = ?
                """, String.class, subjectId);

        jdbcTemplate.update("""
                UPDATE "ASIGNATURAS"
                SET "CODIGO" = ?,
                    "NOMBRE" = ?,
                    "AREA" = ?,
                    "COLOR_HEX" = ?,
                    "DESCRIPCION" = ?,
                    "NIVEL_REFERENCIA" = ?,
                    "TIPO_EVALUACION" = ?,
                    "HORAS_SUGERIDAS" = ?
                WHERE "ID" = ?
                """, code, name, area, colorHex, description, referenceLevel, evaluationType, suggestedHours, subjectId);

        replaceSubjectApplicableGrades(subjectId, applicableGradeIds);
        replaceSubjectApplicableCourses(subjectId, referenceLevel, applicableCourseIds);
        replaceSubjectTeachers(subjectId, name, previousName, teacherIds);
        return findActiveSubjectById(subjectId).orElseThrow();
    }

    @Override
    public void deactivateSubject(Long subjectId) {
        if (tableExists("PROFESOR_ASIGNATURAS")) {
            if (columnExists("PROFESOR_ASIGNATURAS", "ACTIVO")) {
                jdbcTemplate.update("""
                        UPDATE "PROFESOR_ASIGNATURAS"
                        SET "ACTIVO" = FALSE
                        WHERE "ASIGNATURA_ID" = ?
                        """, subjectId);
            } else {
                jdbcTemplate.update("""
                        DELETE FROM "PROFESOR_ASIGNATURAS"
                        WHERE "ASIGNATURA_ID" = ?
                        """, subjectId);
            }
        }

        if (tableExists("CURSO_ASIGNATURAS")) {
            if (columnExists("CURSO_ASIGNATURAS", "ACTIVA")) {
                jdbcTemplate.update("""
                        UPDATE "CURSO_ASIGNATURAS"
                        SET "ACTIVA" = FALSE
                        WHERE "ASIGNATURA_ID" = ?
                        """, subjectId);
            } else {
                jdbcTemplate.update("""
                        DELETE FROM "CURSO_ASIGNATURAS"
                        WHERE "ASIGNATURA_ID" = ?
                        """, subjectId);
            }
        }

        if (tableExists("ASIGNATURA_GRADOS")) {
            jdbcTemplate.update("""
                    DELETE FROM "ASIGNATURA_GRADOS"
                    WHERE "ASIGNATURA_ID" = ?
                    """, subjectId);
        }

        if (tableExists("ASIGNATURA_CURSOS")) {
            jdbcTemplate.update("""
                    DELETE FROM "ASIGNATURA_CURSOS"
                    WHERE "ASIGNATURA_ID" = ?
                    """, subjectId);
        }

        if (tableExists("CARGAS_DOCENTES")) {
            jdbcTemplate.update("""
                    UPDATE "CARGAS_DOCENTES"
                    SET "ACTIVA" = FALSE
                    WHERE "ASIGNATURA_ID" = ?
                    """, subjectId);
        }

        jdbcTemplate.update("""
                UPDATE "ASIGNATURAS"
                SET "ACTIVA" = FALSE
                WHERE "ID" = ?
                """, subjectId);
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

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = ?
                """, Integer.class, tableName);
        return count != null && count > 0;
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

    private boolean scheduleCourseScopeAvailable() {
        return columnExists("BLOQUES_HORARIOS", "CURSO_ID");
    }

    private ScheduleEntry mapScheduleEntry(ResultSet rs) throws SQLException {
        return new ScheduleEntry(
                rs.getLong("schedule_id"),
                rs.getLong("load_id"),
                rs.getLong("period_id"),
                rs.getString("period_name"),
                rs.getLong("course_id"),
                rs.getString("course_name"),
                rs.getLong("teacher_id"),
                rs.getString("teacher_code"),
                rs.getString("teacher_name"),
                rs.getLong("subject_id"),
                rs.getString("subject_code"),
                rs.getString("subject_name"),
                rs.getString("subject_color_hex"),
                rs.getLong("block_id"),
                rs.getString("day_of_week"),
                formatTime(rs.getTime("start_time").toLocalTime()),
                formatTime(rs.getTime("end_time").toLocalTime()),
                rs.getInt("block_order"),
                rs.getString("block_type"),
                rs.getString("room")
        );
    }

    private ScheduleBlock mapBlock(ResultSet rs) throws SQLException {
        return new ScheduleBlock(
                rs.getLong("ID"),
                rs.getString("DIA_SEMANA"),
                formatTime(rs.getTime("HORA_INICIO").toLocalTime()),
                formatTime(rs.getTime("HORA_FIN").toLocalTime()),
                rs.getInt("ORDEN"),
                rs.getString("TIPO_BLOQUE")
        );
    }

    private AcademicSubject mapSubject(ResultSet rs) throws SQLException {
        Long subjectId = rs.getLong("ID");
        String subjectName = rs.getString("NOMBRE");
        return new AcademicSubject(
                subjectId,
                rs.getString("CODIGO"),
                subjectName,
                rs.getString("AREA"),
                rs.getString("COLOR_HEX"),
                rs.getString("DESCRIPCION"),
                rs.getString("NIVEL_REFERENCIA"),
                rs.getString("TIPO_EVALUACION"),
                rs.getString("DISPLAY_LEVEL"),
                rs.getInt("HORAS_SUGERIDAS"),
                rs.getBoolean("ACTIVA"),
                findAssignedTeachersBySubjectId(subjectId, subjectName),
                findApplicableGradeIdsBySubjectId(subjectId),
                findApplicableGradeNamesBySubjectId(subjectId),
                findApplicableCourseIdsBySubjectId(subjectId),
                findApplicableCourseNamesBySubjectId(subjectId)
        );
    }

    private void appendSubjectLevelJoin(StringBuilder sql) {
        if (!tableExists("CARGAS_DOCENTES")
                || !tableExists("CURSOS")
                || !columnExists("CARGAS_DOCENTES", "ASIGNATURA_ID")
                || !columnExists("CARGAS_DOCENTES", "CURSO_ID")) {
            return;
        }

        String levelSource = courseNormalizationAvailable()
                ? "COALESCE(cn.\"NOMBRE\", c.\"NIVEL\")"
                : "COALESCE(c.\"NIVEL\", '')";

        sql.append("""
                LEFT JOIN (
                    SELECT
                        cd."ASIGNATURA_ID" AS "SUBJECT_ID",
                        STRING_AGG(DISTINCT %s, ', ' ORDER BY %s) AS "DISPLAY_LEVEL"
                    FROM "CARGAS_DOCENTES" cd
                    JOIN "CURSOS" c
                      ON c."ID" = cd."CURSO_ID"
                     AND c."ACTIVO" = TRUE
                """.formatted(levelSource, levelSource));

        if (courseNormalizationAvailable()) {
            sql.append("""
                    LEFT JOIN "CURSO_GRADOS" cg
                      ON cg."ID" = c."GRADO_ID"
                    LEFT JOIN "CURSO_NIVELES" cn
                      ON cn."ID" = cg."NIVEL_ID"
                    """);
        }

        sql.append("""
                    WHERE cd."ACTIVA" = TRUE
                    GROUP BY cd."ASIGNATURA_ID"
                ) course_levels
                  ON course_levels."SUBJECT_ID" = a."ID"
                """);
    }

    private String subjectDisplayLevelExpression(String subjectAlias) {
        String fallbackReferenceLevel = "COALESCE(" + subjectAlias + ".\"NIVEL_REFERENCIA\", '')";
        if (tableExists("CARGAS_DOCENTES")
                && tableExists("CURSOS")
                && columnExists("CARGAS_DOCENTES", "ASIGNATURA_ID")
                && columnExists("CARGAS_DOCENTES", "CURSO_ID")) {
            return "COALESCE(NULLIF(course_levels.\"DISPLAY_LEVEL\", ''), NULLIF(" + fallbackReferenceLevel + ", ''), 'Sin nivel')";
        }
        return "COALESCE(NULLIF(" + fallbackReferenceLevel + ", ''), 'Sin nivel')";
    }

    private String normalizedSubjectLevelExpression(String expression) {
        return "UPPER(TRANSLATE(" + expression + ", 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))";
    }

    private boolean courseNormalizationAvailable() {
        return tableExists("CURSO_GRADOS")
                && tableExists("CURSO_NIVELES")
                && columnExists("CURSOS", "GRADO_ID");
    }

    private String formatTime(LocalTime localTime) {
        return localTime.format(TIME_FORMATTER);
    }

    private List<SubjectAssignedTeacher> findAssignedTeachersBySubjectId(Long subjectId, String subjectName) {
        if (!tableExists("PROFESOR_ASIGNATURAS") || !tableExists("PROFESORES") || !tableExists("PERSONAS")) {
            return List.of();
        }

        if (columnExists("PROFESOR_ASIGNATURAS", "ASIGNATURA_ID")) {
            return jdbcTemplate.query("""
                    SELECT DISTINCT
                        pr."ID",
                        pr."CODIGO",
                        TRIM(COALESCE(pe."NOMBRES", '') || ' ' || COALESCE(pe."APELLIDOS", '')) AS full_name
                    FROM "PROFESOR_ASIGNATURAS" pa
                    JOIN "PROFESORES" pr ON pr."ID" = pa."PROFESOR_ID"
                    JOIN "PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
                    WHERE pa."ASIGNATURA_ID" = ?
                      AND pa."ACTIVO" = TRUE
                      AND pr."ACTIVO" = TRUE
                    ORDER BY full_name
                    """, (row, rowNum) -> new SubjectAssignedTeacher(
                    row.getLong("ID"),
                    row.getString("CODIGO"),
                    row.getString("full_name")
            ), subjectId);
        }

        if (!columnExists("PROFESOR_ASIGNATURAS", "ASIGNATURA")) {
            return List.of();
        }

        return jdbcTemplate.query("""
                SELECT DISTINCT
                    pr."ID",
                    pr."CODIGO",
                    TRIM(COALESCE(pe."NOMBRES", '') || ' ' || COALESCE(pe."APELLIDOS", '')) AS full_name
                FROM "PROFESOR_ASIGNATURAS" pa
                JOIN "PROFESORES" pr ON pr."ID" = pa."PROFESOR_ID"
                JOIN "PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
                WHERE UPPER(TRIM(pa."ASIGNATURA")) = UPPER(TRIM(?))
                  AND pa."ACTIVO" = TRUE
                  AND pr."ACTIVO" = TRUE
                ORDER BY full_name
                """, (row, rowNum) -> new SubjectAssignedTeacher(
                row.getLong("ID"),
                row.getString("CODIGO"),
                row.getString("full_name")
        ), subjectName);
    }

    private void replaceSubjectTeachers(Long subjectId, String subjectName, String previousSubjectName, List<Long> teacherIds) {
        if (!tableExists("PROFESOR_ASIGNATURAS")) {
            return;
        }

        List<Long> distinctTeacherIds = teacherIds == null ? List.of() : teacherIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();

        if (columnExists("PROFESOR_ASIGNATURAS", "ASIGNATURA_ID")) {
            jdbcTemplate.update("""
                    DELETE FROM "PROFESOR_ASIGNATURAS"
                    WHERE "ASIGNATURA_ID" = ?
                    """, subjectId);

            if (distinctTeacherIds.isEmpty()) {
                return;
            }

            boolean hasSubjectNameColumn = columnExists("PROFESOR_ASIGNATURAS", "ASIGNATURA");
            for (Long teacherId : distinctTeacherIds) {
                if (hasSubjectNameColumn) {
                    jdbcTemplate.update("""
                            INSERT INTO "PROFESOR_ASIGNATURAS" ("PROFESOR_ID", "ASIGNATURA", "ASIGNATURA_ID", "ACTIVO")
                            VALUES (?, ?, ?, TRUE)
                            """, teacherId, subjectName, subjectId);
                } else {
                    jdbcTemplate.update("""
                            INSERT INTO "PROFESOR_ASIGNATURAS" ("PROFESOR_ID", "ASIGNATURA_ID", "ACTIVO")
                            VALUES (?, ?, TRUE)
                            """, teacherId, subjectId);
                }
            }
            return;
        }

        if (!columnExists("PROFESOR_ASIGNATURAS", "ASIGNATURA")) {
            return;
        }

        List<String> assignmentNames = new ArrayList<>();
        if (previousSubjectName != null && !previousSubjectName.isBlank()) {
            assignmentNames.add(previousSubjectName.trim());
        }
        if (subjectName != null && !subjectName.isBlank() && assignmentNames.stream().noneMatch(name -> name.equalsIgnoreCase(subjectName.trim()))) {
            assignmentNames.add(subjectName.trim());
        }

        if (!assignmentNames.isEmpty()) {
            String placeholders = assignmentNames.stream().map(name -> "?").collect(Collectors.joining(", "));
            List<Object> deleteArgs = new ArrayList<>(assignmentNames);
            jdbcTemplate.update("""
                    DELETE FROM "PROFESOR_ASIGNATURAS"
                    WHERE UPPER(TRIM("ASIGNATURA")) IN (%s)
                    """.formatted(placeholders), deleteArgs.toArray());
        }

        for (Long teacherId : distinctTeacherIds) {
            jdbcTemplate.update("""
                    INSERT INTO "PROFESOR_ASIGNATURAS" ("PROFESOR_ID", "ASIGNATURA", "ACTIVO")
                    VALUES (?, ?, TRUE)
                    """, teacherId, subjectName);
        }
    }

    private List<Long> findApplicableGradeIdsBySubjectId(Long subjectId) {
        if (!tableExists("ASIGNATURA_GRADOS")) {
            return List.of();
        }

        return jdbcTemplate.query("""
                SELECT ag."GRADO_ID"
                FROM "ASIGNATURA_GRADOS" ag
                WHERE ag."ASIGNATURA_ID" = ?
                  AND ag."ACTIVA" = TRUE
                ORDER BY ag."GRADO_ID"
                """, (rs, rowNum) -> rs.getLong("GRADO_ID"), subjectId);
    }

    private List<Long> findApplicableCourseIdsBySubjectId(Long subjectId) {
        if (tableExists("ASIGNATURA_CURSOS")) {
            return jdbcTemplate.query("""
                    SELECT ac."CURSO_ID"
                    FROM "ASIGNATURA_CURSOS" ac
                    WHERE ac."ASIGNATURA_ID" = ?
                      AND ac."ACTIVA" = TRUE
                    ORDER BY ac."CURSO_ID"
                    """, (rs, rowNum) -> rs.getLong("CURSO_ID"), subjectId);
        }

        if (!tableExists("CURSO_ASIGNATURAS")) {
            return List.of();
        }

        return jdbcTemplate.query("""
                SELECT DISTINCT ca."CURSO_ID"
                FROM "CURSO_ASIGNATURAS" ca
                WHERE ca."ASIGNATURA_ID" = ?
                  AND ca."ACTIVA" = TRUE
                ORDER BY ca."CURSO_ID"
                """, (rs, rowNum) -> rs.getLong("CURSO_ID"), subjectId);
    }

    private List<String> findApplicableGradeNamesBySubjectId(Long subjectId) {
        if (!tableExists("ASIGNATURA_GRADOS") || !tableExists("CURSO_GRADOS")) {
            return List.of();
        }

        return jdbcTemplate.query("""
                SELECT cg."NOMBRE"
                FROM "ASIGNATURA_GRADOS" ag
                JOIN "CURSO_GRADOS" cg
                  ON cg."ID" = ag."GRADO_ID"
                WHERE ag."ASIGNATURA_ID" = ?
                  AND ag."ACTIVA" = TRUE
                  AND cg."ACTIVO" = TRUE
                ORDER BY cg."ORDEN", cg."NOMBRE"
                """, (rs, rowNum) -> rs.getString("NOMBRE"), subjectId);
    }

    private List<String> findApplicableCourseNamesBySubjectId(Long subjectId) {
        if (!tableExists("CURSOS")) {
            return List.of();
        }

        if (tableExists("ASIGNATURA_CURSOS")) {
            return jdbcTemplate.query("""
                    SELECT c."NOMBRE" || CASE WHEN COALESCE(c."LETRA", '') <> '' THEN ' ' || c."LETRA" ELSE '' END AS "COURSE_NAME"
                    FROM "ASIGNATURA_CURSOS" ac
                    JOIN "CURSOS" c
                      ON c."ID" = ac."CURSO_ID"
                    WHERE ac."ASIGNATURA_ID" = ?
                      AND ac."ACTIVA" = TRUE
                      AND c."ACTIVO" = TRUE
                    ORDER BY c."ANIO_ESCOLAR" DESC, c."NOMBRE", c."LETRA"
                    """, (rs, rowNum) -> rs.getString("COURSE_NAME"), subjectId);
        }

        if (!tableExists("CURSO_ASIGNATURAS")) {
            return List.of();
        }

        return jdbcTemplate.query("""
                SELECT DISTINCT c."NOMBRE" || CASE WHEN COALESCE(c."LETRA", '') <> '' THEN ' ' || c."LETRA" ELSE '' END AS "COURSE_NAME"
                FROM "CURSO_ASIGNATURAS" ca
                JOIN "CURSOS" c
                  ON c."ID" = ca."CURSO_ID"
                WHERE ca."ASIGNATURA_ID" = ?
                  AND ca."ACTIVA" = TRUE
                  AND c."ACTIVO" = TRUE
                ORDER BY "COURSE_NAME"
                """, (rs, rowNum) -> rs.getString("COURSE_NAME"), subjectId);
    }

    private void replaceSubjectApplicableGrades(Long subjectId, List<Long> applicableGradeIds) {
        if (!tableExists("ASIGNATURA_GRADOS")) {
            return;
        }

        jdbcTemplate.update("""
                DELETE FROM "ASIGNATURA_GRADOS"
                WHERE "ASIGNATURA_ID" = ?
                """, subjectId);

        List<Long> distinctGradeIds = applicableGradeIds == null ? List.of() : applicableGradeIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (distinctGradeIds.isEmpty()) {
            return;
        }

        for (Long gradeId : distinctGradeIds) {
            jdbcTemplate.update("""
                    INSERT INTO "ASIGNATURA_GRADOS" ("ASIGNATURA_ID", "GRADO_ID", "ACTIVA")
                    SELECT ?, cg."ID", TRUE
                    FROM "CURSO_GRADOS" cg
                    WHERE cg."ID" = ?
                      AND cg."ACTIVO" = TRUE
                    ON CONFLICT ("ASIGNATURA_ID", "GRADO_ID")
                    DO UPDATE SET "ACTIVA" = TRUE
                    """, subjectId, gradeId);
        }
    }

    private void replaceSubjectApplicableCourses(Long subjectId, String referenceLevel, List<Long> applicableCourseIds) {
        List<Long> distinctCourseIds = resolveApplicableCourseIds(referenceLevel, applicableCourseIds);

        if (tableExists("ASIGNATURA_CURSOS")) {
            jdbcTemplate.update("""
                    DELETE FROM "ASIGNATURA_CURSOS"
                    WHERE "ASIGNATURA_ID" = ?
                    """, subjectId);

            for (Long courseId : distinctCourseIds) {
                jdbcTemplate.update("""
                        INSERT INTO "ASIGNATURA_CURSOS" ("ASIGNATURA_ID", "CURSO_ID", "ACTIVA")
                        SELECT ?, c."ID", TRUE
                        FROM "CURSOS" c
                        WHERE c."ID" = ?
                          AND c."ACTIVO" = TRUE
                        ON CONFLICT ("ASIGNATURA_ID", "CURSO_ID")
                        DO UPDATE SET "ACTIVA" = TRUE
                        """, subjectId, courseId);
            }
        }

        if (!tableExists("CURSO_ASIGNATURAS")) {
            return;
        }

        jdbcTemplate.update("""
                DELETE FROM "CURSO_ASIGNATURAS"
                WHERE "ASIGNATURA_ID" = ?
                """, subjectId);

        for (Long courseId : distinctCourseIds) {
            jdbcTemplate.update("""
                    INSERT INTO "CURSO_ASIGNATURAS" ("CURSO_ID", "ASIGNATURA_ID", "ACTIVA")
                    SELECT c."ID", ?, TRUE
                    FROM "CURSOS" c
                    WHERE c."ID" = ?
                      AND c."ACTIVO" = TRUE
                    """, subjectId, courseId);
        }
    }

    private List<Long> resolveApplicableCourseIds(String referenceLevel, List<Long> applicableCourseIds) {
        List<Long> distinctCourseIds = applicableCourseIds == null ? List.of() : applicableCourseIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (!distinctCourseIds.isEmpty()) {
            return distinctCourseIds;
        }
        return findActiveCourseIdsByLevel(referenceLevel);
    }

    private List<Long> findActiveCourseIdsByLevel(String referenceLevel) {
        if (!tableExists("CURSOS")) {
            return List.of();
        }

        String normalizedLevel = normalizeLevel(referenceLevel);
        if (normalizedLevel.isBlank()) {
            return jdbcTemplate.query("""
                    SELECT "ID"
                    FROM "CURSOS"
                    WHERE "ACTIVO" = TRUE
                    ORDER BY "ANIO_ESCOLAR" DESC, "NOMBRE", "LETRA"
                    """, (rs, rowNum) -> rs.getLong("ID"));
        }

        if (courseNormalizationAvailable()) {
            return jdbcTemplate.query("""
                    SELECT c."ID"
                    FROM "CURSOS" c
                    LEFT JOIN "CURSO_GRADOS" cg
                      ON cg."ID" = c."GRADO_ID"
                    LEFT JOIN "CURSO_NIVELES" cn
                      ON cn."ID" = cg."NIVEL_ID"
                    WHERE c."ACTIVO" = TRUE
                      AND UPPER(TRANSLATE(COALESCE(cn."NOMBRE", c."NIVEL", ''), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) = ?
                    ORDER BY c."ANIO_ESCOLAR" DESC, c."NOMBRE", c."LETRA"
                    """, (rs, rowNum) -> rs.getLong("ID"), normalizedLevel);
        }

        return jdbcTemplate.query("""
                SELECT c."ID"
                FROM "CURSOS" c
                WHERE c."ACTIVO" = TRUE
                  AND UPPER(TRANSLATE(COALESCE(c."NIVEL", ''), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) = ?
                ORDER BY c."ANIO_ESCOLAR" DESC, c."NOMBRE", c."LETRA"
                """, (rs, rowNum) -> rs.getLong("ID"), normalizedLevel);
    }

    private String normalizeLevel(String referenceLevel) {
        if (referenceLevel == null) {
            return "";
        }
        return java.text.Normalizer.normalize(referenceLevel.trim(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(java.util.Locale.ROOT);
    }
}
