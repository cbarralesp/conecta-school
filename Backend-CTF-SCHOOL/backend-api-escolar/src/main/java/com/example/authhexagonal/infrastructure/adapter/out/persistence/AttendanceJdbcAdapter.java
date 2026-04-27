package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.AttendanceCourseOption;
import com.example.authhexagonal.domain.model.AttendanceRecordEntry;
import com.example.authhexagonal.domain.model.AttendanceStudentInfo;
import com.example.authhexagonal.domain.model.DailyAttendanceCommand;
import com.example.authhexagonal.domain.port.out.ManageAttendancePort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

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
                SELECT ordered."ID", ordered."NOMBRE", ordered."ANIO_ESCOLAR"
                FROM (
                    SELECT DISTINCT
                        c."ID",
                        c."NOMBRE",
                        c."ANIO_ESCOLAR",
                        CASE
                            WHEN UPPER(c."NOMBRE") LIKE '%PK%' THEN 0
                            WHEN UPPER(c."NOMBRE") LIKE '%KINDER%' THEN 1
                            ELSE 2
                        END AS sort_priority
                    FROM "CURSOS" c
                    JOIN "MATRICULAS" m ON m."CURSO_ID" = c."ID"
                    WHERE c."ACTIVO" = TRUE
                      AND m."ACTIVA" = TRUE
                ) ordered
                ORDER BY ordered.sort_priority, ordered."NOMBRE"
                """, (rs, rowNum) -> new AttendanceCourseOption(
                rs.getLong("ID"),
                rs.getString("NOMBRE"),
                rs.getInt("ANIO_ESCOLAR")
        ));
    }

    @Override
    public Optional<AttendanceCourseOption> findAttendanceCourseById(Long courseId) {
        return jdbcTemplate.query("""
                SELECT "ID", "NOMBRE", "ANIO_ESCOLAR"
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
                ORDER BY ar."FECHA", ad."ALUMNO_ID"
                """, (rs, rowNum) -> mapAttendanceEntry(rs), courseId, startDate, endDate);
    }

    @Override
    public int countRecordedSchoolDays(Long courseId, LocalDate startDate, LocalDate endDate) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(DISTINCT "FECHA")
                FROM "ASISTENCIA_REGISTROS"
                WHERE "CURSO_ID" = ?
                  AND "ACTIVO" = TRUE
                  AND "FECHA" BETWEEN ? AND ?
                """, Integer.class, courseId, startDate, endDate);
        return count == null ? 0 : count;
    }

    @Override
    public void saveDailyAttendance(Long courseId, LocalDate date, List<DailyAttendanceCommand> commands) {
        Long registerId = jdbcTemplate.queryForObject("""
                INSERT INTO "ASISTENCIA_REGISTROS" ("CURSO_ID", "FECHA", "ACTIVO", "CREADO_EN", "ACTUALIZADO_EN")
                VALUES (?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT ("CURSO_ID", "FECHA")
                DO UPDATE SET "ACTUALIZADO_EN" = CURRENT_TIMESTAMP
                RETURNING "ID"
                """, Long.class, courseId, date);

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
