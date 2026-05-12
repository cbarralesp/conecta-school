package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.AcademicSubject;
import com.example.authhexagonal.domain.model.ScheduleBlock;
import com.example.authhexagonal.domain.model.ScheduleCourseOption;
import com.example.authhexagonal.domain.model.ScheduleEntry;
import com.example.authhexagonal.domain.model.SchedulePeriodOption;
import com.example.authhexagonal.domain.model.ScheduleTeacherOption;
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
                    "NOMBRE" || CASE WHEN COALESCE("LETRA", '') <> '' THEN ' ' || "LETRA" ELSE '' END AS "NOMBRE",
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
                    "NOMBRE" || CASE WHEN COALESCE("LETRA", '') <> '' THEN ' ' || "LETRA" ELSE '' END AS "NOMBRE",
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
    public List<ScheduleBlock> findWeeklyScheduleBlocks() {
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
    public List<ScheduleBlock> findActiveScheduleBlocksByOrder(int order) {
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
    public void updateScheduleBlocksTimeByOrder(int order, String startTime, String endTime) {
        jdbcTemplate.update("""
                UPDATE "BLOQUES_HORARIOS"
                SET "HORA_INICIO" = CAST(? AS TIME),
                    "HORA_FIN" = CAST(? AS TIME)
                WHERE "ORDEN" = ?
                  AND "ACTIVO" = TRUE
                """, startTime, endTime, order);
    }

    @Override
    public void createBreakBlocks(String startTime, String endTime, int order) {
        List<String> weekdays = List.of("LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES");
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
                    VALUES (?, CAST(? AS TIME), CAST(? AS TIME), ?, 'RECREO', TRUE)
                    """, weekday, startTime, endTime, order);
        }
    }

    @Override
    public void deactivateScheduleBlocksByOrder(int order) {
        jdbcTemplate.update("""
                UPDATE "BLOQUES_HORARIOS"
                SET "ACTIVO" = FALSE
                WHERE "ORDEN" = ?
                """, order);
    }

    @Override
    public boolean hasScheduleEntriesForOrder(int order) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "HORARIOS_CARGAS" hc
                JOIN "BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID"
                WHERE bh."ORDEN" = ?
                  AND bh."ACTIVO" = TRUE
                """, Integer.class, order);
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
        StringBuilder sql = new StringBuilder("""
                SELECT
                    "ID",
                    "CODIGO",
                    "NOMBRE",
                    "AREA",
                    "COLOR_HEX",
                    COALESCE("DESCRIPCION", '') AS "DESCRIPCION",
                    COALESCE("NIVEL_REFERENCIA", '') AS "NIVEL_REFERENCIA",
                    COALESCE("HORAS_SUGERIDAS", 2) AS "HORAS_SUGERIDAS",
                    "ACTIVA"
                FROM "ASIGNATURAS"
                WHERE "ACTIVA" = TRUE
                """);

        List<Object> args = new java.util.ArrayList<>();
        if (search != null && !search.isBlank()) {
            sql.append("""
                     AND (
                        UPPER("CODIGO") LIKE UPPER(?)
                        OR UPPER("NOMBRE") LIKE UPPER(?)
                        OR UPPER("AREA") LIKE UPPER(?)
                        OR UPPER(COALESCE("NIVEL_REFERENCIA", '')) LIKE UPPER(?)
                        OR UPPER(COALESCE("DESCRIPCION", '')) LIKE UPPER(?)
                    )
                    """);
            String pattern = "%" + search.trim() + "%";
            args.add(pattern);
            args.add(pattern);
            args.add(pattern);
            args.add(pattern);
            args.add(pattern);
        }

        if ("basic".equalsIgnoreCase(levelGroup)) {
            sql.append(" AND UPPER(COALESCE(\"NIVEL_REFERENCIA\", '')) LIKE UPPER('%BASICA%')");
        } else if ("media".equalsIgnoreCase(levelGroup)) {
            sql.append(" AND UPPER(COALESCE(\"NIVEL_REFERENCIA\", '')) LIKE UPPER('%MEDIA%')");
        }

        sql.append(" ORDER BY \"NOMBRE\"");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapSubject(rs), args.toArray());
    }

    @Override
    public Optional<AcademicSubject> findActiveSubjectById(Long subjectId) {
        return jdbcTemplate.query("""
                SELECT
                    "ID",
                    "CODIGO",
                    "NOMBRE",
                    "AREA",
                    "COLOR_HEX",
                    COALESCE("DESCRIPCION", '') AS "DESCRIPCION",
                    COALESCE("NIVEL_REFERENCIA", '') AS "NIVEL_REFERENCIA",
                    COALESCE("HORAS_SUGERIDAS", 2) AS "HORAS_SUGERIDAS",
                    "ACTIVA"
                FROM "ASIGNATURAS"
                WHERE "ID" = ?
                  AND "ACTIVA" = TRUE
                """, (rs, rowNum) -> mapSubject(rs), subjectId).stream().findFirst();
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
            int suggestedHours
    ) {
        Long subjectId = jdbcTemplate.queryForObject("""
                INSERT INTO "ASIGNATURAS" (
                    "CODIGO",
                    "NOMBRE",
                    "AREA",
                    "COLOR_HEX",
                    "DESCRIPCION",
                    "NIVEL_REFERENCIA",
                    "HORAS_SUGERIDAS",
                    "ACTIVA"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
                RETURNING "ID"
                """, Long.class, code, name, area, colorHex, description, referenceLevel, suggestedHours);

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
            int suggestedHours
    ) {
        jdbcTemplate.update("""
                UPDATE "ASIGNATURAS"
                SET "CODIGO" = ?,
                    "NOMBRE" = ?,
                    "AREA" = ?,
                    "COLOR_HEX" = ?,
                    "DESCRIPCION" = ?,
                    "NIVEL_REFERENCIA" = ?,
                    "HORAS_SUGERIDAS" = ?
                WHERE "ID" = ?
                """, code, name, area, colorHex, description, referenceLevel, suggestedHours, subjectId);

        return findActiveSubjectById(subjectId).orElseThrow();
    }

    @Override
    public boolean hasActiveTeachingLoad(Long subjectId) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "CARGAS_DOCENTES"
                WHERE "ASIGNATURA_ID" = ?
                  AND "ACTIVA" = TRUE
                """, Integer.class, subjectId);
        return count != null && count > 0;
    }

    @Override
    public void deactivateSubject(Long subjectId) {
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
        return new AcademicSubject(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getString("AREA"),
                rs.getString("COLOR_HEX"),
                rs.getString("DESCRIPCION"),
                rs.getString("NIVEL_REFERENCIA"),
                rs.getInt("HORAS_SUGERIDAS"),
                rs.getBoolean("ACTIVA")
        );
    }

    private String formatTime(LocalTime localTime) {
        return localTime.format(TIME_FORMATTER);
    }
}
