package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.AttendanceCourseOption;
import com.example.authhexagonal.domain.model.AttendanceRecordEntry;
import com.example.authhexagonal.domain.model.AttendanceSpecialActivity;
import com.example.authhexagonal.domain.model.AttendanceStudentSummary;
import com.example.authhexagonal.domain.model.AttendanceStudentInfo;
import com.example.authhexagonal.domain.model.DailyAttendanceCommand;
import com.example.authhexagonal.domain.model.DailyAttendanceRegisterState;
import com.example.authhexagonal.domain.port.out.ManageAttendancePort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Component
public class AttendanceJdbcAdapter implements ManageAttendancePort {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final JdbcTemplate jdbcTemplate;

    public AttendanceJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<AttendanceCourseOption> findAttendanceCourses() {
        return jdbcTemplate.query("""
                SELECT
                    c."ID",
                    c."NOMBRE" || CASE WHEN COALESCE(c."LETRA", '') <> '' THEN ' ' || c."LETRA" ELSE '' END AS "NOMBRE",
                    c."ANIO_ESCOLAR"
                FROM "CURSOS" c
                WHERE c."ACTIVO" = TRUE
                ORDER BY
                    CASE
                        WHEN UPPER(c."NOMBRE") LIKE '%PK%' THEN 0
                        WHEN UPPER(c."NOMBRE") LIKE '%KINDER%' THEN 1
                        ELSE 2
                    END,
                    c."ANIO_ESCOLAR" DESC,
                    c."NOMBRE",
                    c."LETRA"
                """, (rs, rowNum) -> new AttendanceCourseOption(
                rs.getLong("ID"),
                rs.getString("NOMBRE"),
                rs.getInt("ANIO_ESCOLAR")
        ));
    }

    @Override
    public Optional<AttendanceCourseOption> findAttendanceCourseById(Long courseId) {
        return jdbcTemplate.query("""
                SELECT
                    "ID",
                    "NOMBRE" || CASE WHEN COALESCE("LETRA", '') <> '' THEN ' ' || "LETRA" ELSE '' END AS "NOMBRE",
                    "ANIO_ESCOLAR"
                FROM "CURSOS"
                WHERE "ID" = ?
                  AND "ACTIVO" = TRUE
                """, (rs, rowNum) -> new AttendanceCourseOption(
                rs.getLong("ID"),
                rs.getString("NOMBRE"),
                rs.getInt("ANIO_ESCOLAR")
        ), courseId).stream().findFirst();
    }

    @Override
    public List<AttendanceStudentInfo> findActiveStudentsByCourse(Long courseId) {
        return jdbcTemplate.query("""
                SELECT a."ID", a."RUN", a."NOMBRE" || ' ' || a."APELLIDOS" AS full_name
                FROM "MATRICULAS" m
                JOIN "ALUMNOS" a ON a."ID" = m."ALUMNO_ID"
                WHERE m."CURSO_ID" = ?
                  AND m."ACTIVA" = TRUE
                ORDER BY a."NOMBRE", a."APELLIDOS"
                """, (rs, rowNum) -> new AttendanceStudentInfo(
                rs.getLong("ID"),
                rs.getString("RUN"),
                rs.getString("full_name")
        ), courseId);
    }

    @Override
    public List<AttendanceRecordEntry> findAttendanceEntriesByCourseAndPeriod(Long courseId, LocalDate startDate, LocalDate endDate) {
        return jdbcTemplate.query("""
                SELECT ad."ALUMNO_ID", ar."FECHA", ad."ESTADO", ad."HORA_LLEGADA", COALESCE(ad."OBSERVACION", '') AS "OBSERVACION"
                FROM "ASISTENCIA_REGISTROS" ar
                JOIN "ASISTENCIA_DETALLES" ad ON ad."REGISTRO_ID" = ar."ID"
                WHERE ar."CURSO_ID" = ?
                  AND ar."ACTIVO" = TRUE
                  AND ad."ACTIVO" = TRUE
                  AND ar."FECHA" BETWEEN ? AND ?
                  AND COALESCE(ar."CLASES_SUSPENDIDAS", FALSE) = FALSE
                ORDER BY ar."FECHA", ad."ALUMNO_ID"
                """, (rs, rowNum) -> mapAttendanceEntry(rs), courseId, startDate, endDate);
    }

    @Override
    public Optional<DailyAttendanceRegisterState> findDailyAttendanceRegisterState(Long courseId, LocalDate date) {
        return jdbcTemplate.query("""
                SELECT
                    COALESCE(ar."CLASES_SUSPENDIDAS", FALSE) AS "CLASES_SUSPENDIDAS",
                    COALESCE(ar."MOTIVO_SUSPENSION", '') AS "MOTIVO_SUSPENSION"
                FROM "ASISTENCIA_REGISTROS" ar
                WHERE ar."CURSO_ID" = ?
                  AND ar."FECHA" = ?
                  AND ar."ACTIVO" = TRUE
                """, (rs, rowNum) -> new DailyAttendanceRegisterState(
                rs.getBoolean("CLASES_SUSPENDIDAS"),
                rs.getString("MOTIVO_SUSPENSION")
        ), courseId, date).stream().findFirst();
    }

    @Override
    public Set<LocalDate> findSuspendedClassDatesByCourseAndPeriod(Long courseId, LocalDate startDate, LocalDate endDate) {
        return new HashSet<>(jdbcTemplate.query("""
                SELECT ar."FECHA"
                FROM "ASISTENCIA_REGISTROS" ar
                WHERE ar."CURSO_ID" = ?
                  AND ar."ACTIVO" = TRUE
                  AND COALESCE(ar."CLASES_SUSPENDIDAS", FALSE) = TRUE
                  AND ar."FECHA" BETWEEN ? AND ?
                ORDER BY ar."FECHA"
                """, (rs, rowNum) -> rs.getDate("FECHA").toLocalDate(), courseId, startDate, endDate));
    }

    @Override
    public List<AttendanceSpecialActivity> findSpecialActivitiesByCourseAndPeriod(Long courseId, LocalDate startDate, LocalDate endDate) {
        return jdbcTemplate.query("""
                SELECT
                    t."CODIGO" AS "TIPO_CODIGO",
                    a."TITULO",
                    a."FECHA",
                    COALESCE(a."FECHA_FIN", a."FECHA") AS "FECHA_FIN"
                FROM "ACTIVIDADES_ESCOLARES" a
                JOIN "TIPOS_ACTIVIDAD" t ON t."ID" = a."TIPO_ACTIVIDAD_ID"
                WHERE a."ACTIVO" = TRUE
                  AND t."ACTIVO" = TRUE
                  AND t."CODIGO" IN ('VACACIONES', 'FERIADO', 'INTERFERIADO', 'SUSPENSION')
                  AND a."FECHA" <= ?
                  AND COALESCE(a."FECHA_FIN", a."FECHA") >= ?
                  AND (a."CURSO_ID" = ? OR a."CURSO_ID" IS NULL)
                ORDER BY a."FECHA", a."TITULO"
                """, (rs, rowNum) -> new AttendanceSpecialActivity(
                rs.getString("TIPO_CODIGO"),
                rs.getString("TITULO"),
                rs.getDate("FECHA").toLocalDate(),
                rs.getDate("FECHA_FIN").toLocalDate()
        ), endDate, startDate, courseId);
    }

    @Override
    public int countRecordedSchoolDays(Long courseId, LocalDate startDate, LocalDate endDate) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(DISTINCT "FECHA")
                FROM "ASISTENCIA_REGISTROS" ar
                WHERE ar."CURSO_ID" = ?
                  AND ar."ACTIVO" = TRUE
                  AND ar."FECHA" BETWEEN ? AND ?
                  AND EXISTS (
                      SELECT 1
                      FROM "ASISTENCIA_DETALLES" ad
                      WHERE ad."REGISTRO_ID" = ar."ID"
                        AND ad."ACTIVO" = TRUE
                        AND UPPER(COALESCE(ad."ESTADO", '')) NOT IN ('SUSPENDIDO', 'SUSPENSION', 'SUSPENSIÓN')
                  )
                """, Integer.class, courseId, startDate, endDate);
        return count == null ? 0 : count;
    }

    @Override
    public AttendanceStudentSummary findStudentAttendanceSummary(Long courseId, Long studentId, LocalDate startDate, LocalDate endDate) {
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
                  AND ad."ALUMNO_ID" = ?
                  AND ar."ACTIVO" = TRUE
                  AND ad."ACTIVO" = TRUE
                  AND ar."FECHA" BETWEEN ? AND ?
                """, (rs, rowNum) -> {
            int presentCount = rs.getInt("present_count");
            int lateCount = rs.getInt("late_count");
            int absentCount = rs.getInt("absent_count");
            int totalCount = rs.getInt("total_count");
            int percentage = totalCount == 0 ? 0 : (int) Math.round(((presentCount + lateCount) * 100.0) / totalCount);
            return new AttendanceStudentSummary(studentId, percentage, presentCount, absentCount, lateCount, totalCount);
        }, courseId, studentId, startDate, endDate).stream().findFirst()
                .orElse(new AttendanceStudentSummary(studentId, 0, 0, 0, 0, 0));
    }

    @Override
    public void saveDailyAttendance(Long courseId, LocalDate date, boolean classSuspended, String suspensionReason, List<DailyAttendanceCommand> commands) {
        Long registerId = jdbcTemplate.queryForObject("""
                INSERT INTO "ASISTENCIA_REGISTROS" (
                    "CURSO_ID",
                    "FECHA",
                    "CLASES_SUSPENDIDAS",
                    "MOTIVO_SUSPENSION",
                    "ACTIVO",
                    "CREADO_EN",
                    "ACTUALIZADO_EN"
                )
                VALUES (?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT ("CURSO_ID", "FECHA")
                DO UPDATE SET
                    "CLASES_SUSPENDIDAS" = EXCLUDED."CLASES_SUSPENDIDAS",
                    "MOTIVO_SUSPENSION" = EXCLUDED."MOTIVO_SUSPENSION",
                    "ACTUALIZADO_EN" = CURRENT_TIMESTAMP
                RETURNING "ID"
                """, Long.class, courseId, date, classSuspended, suspensionReason);

        if (classSuspended) {
            jdbcTemplate.update("""
                    DELETE FROM "ASISTENCIA_DETALLES"
                    WHERE "REGISTRO_ID" = ?
                    """, registerId);
            return;
        }

        for (DailyAttendanceCommand command : commands) {
            if ("SIN_MARCAR".equalsIgnoreCase(command.status())) {
                jdbcTemplate.update("""
                        DELETE FROM "ASISTENCIA_DETALLES"
                        WHERE "REGISTRO_ID" = ?
                          AND "ALUMNO_ID" = ?
                        """, registerId, command.studentId());
                continue;
            }

            Integer count = jdbcTemplate.queryForObject("""
                    SELECT COUNT(1)
                    FROM "ASISTENCIA_DETALLES"
                    WHERE "REGISTRO_ID" = ?
                      AND "ALUMNO_ID" = ?
                    """, Integer.class, registerId, command.studentId());

            LocalTime arrivalTime = command.arrivalTime() == null || command.arrivalTime().isBlank()
                    ? null
                    : LocalTime.parse(command.arrivalTime(), TIME_FORMATTER);

            if (count != null && count > 0) {
                jdbcTemplate.update("""
                        UPDATE "ASISTENCIA_DETALLES"
                        SET "ESTADO" = ?,
                            "HORA_LLEGADA" = ?,
                            "OBSERVACION" = ?,
                            "ACTIVO" = TRUE,
                            "ACTUALIZADO_EN" = CURRENT_TIMESTAMP
                        WHERE "REGISTRO_ID" = ?
                          AND "ALUMNO_ID" = ?
                        """, command.status(), arrivalTime, command.note(), registerId, command.studentId());
            } else {
                jdbcTemplate.update("""
                        INSERT INTO "ASISTENCIA_DETALLES" (
                            "REGISTRO_ID",
                            "ALUMNO_ID",
                            "ESTADO",
                            "HORA_LLEGADA",
                            "OBSERVACION",
                            "ACTIVO",
                            "CREADO_EN",
                            "ACTUALIZADO_EN"
                        ) VALUES (?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        """, registerId, command.studentId(), command.status(), arrivalTime, command.note());
            }
        }
    }

    private AttendanceRecordEntry mapAttendanceEntry(ResultSet rs) throws SQLException {
        LocalTime arrivalTime = rs.getTime("HORA_LLEGADA") == null ? null : rs.getTime("HORA_LLEGADA").toLocalTime();
        return new AttendanceRecordEntry(
                rs.getLong("ALUMNO_ID"),
                rs.getDate("FECHA").toLocalDate(),
                rs.getString("ESTADO"),
                arrivalTime == null ? null : arrivalTime.format(TIME_FORMATTER),
                rs.getString("OBSERVACION")
        );
    }
}


