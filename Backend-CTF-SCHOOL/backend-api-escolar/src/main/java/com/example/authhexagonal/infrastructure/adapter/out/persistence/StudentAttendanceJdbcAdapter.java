package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.StudentAttendanceDetail;
import com.example.authhexagonal.domain.model.StudentAttendanceHeader;
import com.example.authhexagonal.domain.model.StudentAttendanceHistoryDay;
import com.example.authhexagonal.domain.model.StudentAttendanceMonthSummary;
import com.example.authhexagonal.domain.model.StudentAttendanceRecord;
import com.example.authhexagonal.domain.model.StudentAttendanceSummary;
import com.example.authhexagonal.domain.model.StudentAttendanceWeekDay;
import com.example.authhexagonal.domain.port.out.LoadStudentAttendancePort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.sql.Time;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class StudentAttendanceJdbcAdapter implements LoadStudentAttendancePort {

    private static final Locale CHILE = new Locale("es", "CL");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy", CHILE);
    private static final DateTimeFormatter DAY_FORMATTER = DateTimeFormatter.ofPattern("dd MMM", CHILE);
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final JdbcTemplate jdbcTemplate;

    public StudentAttendanceJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<StudentAttendanceDetail> findAttendanceByUsername(String username) {
        List<StudentContextRow> contexts = jdbcTemplate.query("""
                SELECT
                    a."ID" AS student_id,
                    TRIM(a."NOMBRE" || ' ' || a."APELLIDOS") AS student_name,
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    c."ANIO_ESCOLAR" AS school_year
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                JOIN "ALUMNOS" a ON UPPER(a."RUN") = UPPER(p."RUN")
                JOIN "MATRICULAS" m ON m."ALUMNO_ID" = a."ID" AND m."ACTIVA" = TRUE
                JOIN "CURSOS" c ON c."ID" = m."CURSO_ID" AND c."ACTIVO" = TRUE
                WHERE UPPER(u."USUARIO") = UPPER(?)
                   OR UPPER(COALESCE(p."CORREO_ELECTRONICO", '')) = UPPER(?)
                ORDER BY c."ANIO_ESCOLAR" DESC, c."NOMBRE"
                """, (rs, rowNum) -> new StudentContextRow(
                rs.getLong("student_id"),
                rs.getString("student_name"),
                rs.getLong("course_id"),
                rs.getString("course_name"),
                rs.getInt("school_year")
        ), username, username);

        if (contexts.isEmpty()) {
            return Optional.empty();
        }

        StudentContextRow context = contexts.getFirst();
        StudentAttendanceSummary summary = loadSummary(context.studentId());
        StudentAttendanceMonthSummary currentMonth = loadCurrentMonth(context.studentId(), context.schoolYear());
        List<StudentAttendanceWeekDay> currentWeek = loadCurrentWeek(context.studentId(), context.courseId());
        List<StudentAttendanceRecord> recentRecords = loadRecentRecords(context.studentId(), context.courseId());
        List<StudentAttendanceHistoryDay> historyDays = loadHistoryDays(context.studentId(), context.courseId(), context.schoolYear());

        return Optional.of(new StudentAttendanceDetail(
                new StudentAttendanceHeader(
                        context.studentId(),
                        context.studentName(),
                        context.courseName(),
                        currentMonth.monthLabel()
                ),
                summary,
                currentMonth,
                currentWeek,
                recentRecords,
                historyDays
        ));
    }

    private StudentAttendanceSummary loadSummary(Long studentId) {
        return jdbcTemplate.query("""
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
            int percentage = totalCount == 0 ? 0 : (int) Math.round(((presentCount + lateCount) * 100.0) / totalCount);
            return new StudentAttendanceSummary(percentage, presentCount, lateCount, absentCount, totalCount);
        }, studentId).stream().findFirst().orElse(new StudentAttendanceSummary(0, 0, 0, 0, 0));
    }

    private StudentAttendanceMonthSummary loadCurrentMonth(Long studentId, int schoolYear) {
        YearMonth currentMonth = YearMonth.now();
        LocalDate start = currentMonth.atDay(1);
        LocalDate end = currentMonth.atEndOfMonth();

        return jdbcTemplate.query("""
                SELECT
                    COUNT(1) FILTER (WHERE ad."ESTADO" = 'PRESENTE') AS present_count,
                    COUNT(1) FILTER (WHERE ad."ESTADO" IN ('ATRASO', 'ATRASADO')) AS late_count,
                    COUNT(1) FILTER (WHERE ad."ESTADO" = 'AUSENTE' OR UPPER(COALESCE(ad."ESTADO", '')) IN ('SUSPENDIDO', 'SUSPENSION', 'SUSPENSIÓN')) AS absent_count,
                    COUNT(1) AS total_count
                FROM "ASISTENCIA_DETALLES" ad
                JOIN "ASISTENCIA_REGISTROS" ar ON ar."ID" = ad."REGISTRO_ID" AND ar."ACTIVO" = TRUE
                WHERE ad."ALUMNO_ID" = ?
                  AND ad."ACTIVO" = TRUE
                  AND ar."FECHA" BETWEEN ? AND ?
                """, (rs, rowNum) -> {
            int presentCount = rs.getInt("present_count");
            int lateCount = rs.getInt("late_count");
            int absentCount = rs.getInt("absent_count");
            int totalCount = rs.getInt("total_count");
            int percentage = totalCount == 0 ? 0 : (int) Math.round(((presentCount + lateCount) * 100.0) / totalCount);
            String monthLabel = currentMonth.getMonth().getDisplayName(TextStyle.FULL, CHILE) + " " + schoolYear;
            return new StudentAttendanceMonthSummary(
                    capitalize(monthLabel),
                    percentage,
                    presentCount,
                    absentCount,
                    lateCount,
                    totalCount
            );
        }, studentId, start, end).stream().findFirst().orElse(new StudentAttendanceMonthSummary(
                capitalize(currentMonth.getMonth().getDisplayName(TextStyle.FULL, CHILE) + " " + schoolYear),
                0,
                0,
                0,
                0,
                0
        ));
    }

    private List<StudentAttendanceWeekDay> loadCurrentWeek(Long studentId, Long courseId) {
        LocalDate monday = startOfWeek(LocalDate.now());
        LocalDate friday = monday.plusDays(4);

        List<AttendanceWeekRow> rows = jdbcTemplate.query("""
                SELECT
                    ar."FECHA" AS attendance_date,
                    ad."ESTADO" AS status
                FROM "ASISTENCIA_REGISTROS" ar
                LEFT JOIN "ASISTENCIA_DETALLES" ad
                    ON ad."REGISTRO_ID" = ar."ID"
                   AND ad."ALUMNO_ID" = ?
                   AND ad."ACTIVO" = TRUE
                WHERE ar."CURSO_ID" = ?
                  AND ar."ACTIVO" = TRUE
                  AND ar."FECHA" BETWEEN ? AND ?
                ORDER BY ar."FECHA"
                """, (rs, rowNum) -> new AttendanceWeekRow(
                rs.getDate("attendance_date").toLocalDate(),
                rs.getString("status")
        ), studentId, courseId, monday, friday);

        Map<LocalDate, String> statusByDate = new HashMap<>();
        for (AttendanceWeekRow row : rows) {
            statusByDate.put(row.date(), normalizeStatus(row.status()));
        }

        List<StudentAttendanceWeekDay> days = new ArrayList<>();
        for (int offset = 0; offset < 5; offset++) {
            LocalDate current = monday.plusDays(offset);
            days.add(new StudentAttendanceWeekDay(
                    DAY_FORMATTER.format(current),
                    current.getDayOfWeek().getDisplayName(TextStyle.SHORT, CHILE),
                    statusByDate.getOrDefault(current, "SIN REGISTRO"),
                    current.equals(LocalDate.now())
            ));
        }
        return days;
    }

    private List<StudentAttendanceRecord> loadRecentRecords(Long studentId, Long courseId) {
        return jdbcTemplate.query("""
                SELECT
                    ar."FECHA" AS attendance_date,
                    ad."ESTADO" AS status,
                    ad."HORA_LLEGADA" AS arrival_time,
                    COALESCE(ad."OBSERVACION", '') AS note
                FROM "ASISTENCIA_REGISTROS" ar
                JOIN "ASISTENCIA_DETALLES" ad ON ad."REGISTRO_ID" = ar."ID"
                WHERE ar."CURSO_ID" = ?
                  AND ar."ACTIVO" = TRUE
                  AND ad."ALUMNO_ID" = ?
                  AND ad."ACTIVO" = TRUE
                ORDER BY ar."FECHA" DESC
                LIMIT 12
                """, (rs, rowNum) -> new StudentAttendanceRecord(
                DATE_FORMATTER.format(rs.getDate("attendance_date").toLocalDate()),
                normalizeStatus(rs.getString("status")),
                formatTime(rs.getTime("arrival_time")),
                normalizeNote(rs.getString("note"))
        ), courseId, studentId);
    }

    private List<StudentAttendanceHistoryDay> loadHistoryDays(Long studentId, Long courseId, int schoolYear) {
        LocalDate start = LocalDate.of(schoolYear, 3, 1);
        LocalDate end = LocalDate.of(schoolYear, 6, 30);

        Map<LocalDate, String> historyByDate = new HashMap<>();
        jdbcTemplate.query("""
                SELECT
                    ar."FECHA" AS attendance_date,
                    ad."ESTADO" AS status
                FROM "ASISTENCIA_REGISTROS" ar
                JOIN "ASISTENCIA_DETALLES" ad ON ad."REGISTRO_ID" = ar."ID"
                WHERE ad."ALUMNO_ID" = ?
                  AND ad."ACTIVO" = TRUE
                  AND ar."ACTIVO" = TRUE
                  AND ar."FECHA" BETWEEN ? AND ?
                ORDER BY ar."FECHA"
                """, (RowCallbackHandler) rs -> historyByDate.put(
                        rs.getDate("attendance_date").toLocalDate(),
                        normalizeStatus(rs.getString("status"))
                ), studentId, start, end);

        jdbcTemplate.query("""
                SELECT
                    t."CODIGO" AS activity_code,
                    a."FECHA" AS start_date,
                    COALESCE(a."FECHA_FIN", a."FECHA") AS end_date
                FROM "ACTIVIDADES_ESCOLARES" a
                JOIN "TIPOS_ACTIVIDAD" t ON t."ID" = a."TIPO_ACTIVIDAD_ID"
                WHERE a."ACTIVO" = TRUE
                  AND t."ACTIVO" = TRUE
                  AND t."CODIGO" IN ('VACACIONES', 'FERIADO', 'INTERFERIADO', 'SUSPENSION')
                  AND a."FECHA" <= ?
                  AND COALESCE(a."FECHA_FIN", a."FECHA") >= ?
                  AND (a."CURSO_ID" = ? OR a."CURSO_ID" IS NULL)
                ORDER BY a."FECHA"
                """, (RowCallbackHandler) rs -> {
            String normalizedStatus = normalizeSpecialStatus(rs.getString("activity_code"));
            LocalDate current = rs.getDate("start_date").toLocalDate();
            LocalDate endDate = rs.getDate("end_date").toLocalDate();
            while (!current.isAfter(endDate)) {
                historyByDate.putIfAbsent(current, normalizedStatus);
                current = current.plusDays(1);
            }
        }, end, start, courseId);

        return historyByDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new StudentAttendanceHistoryDay(entry.getKey().toString(), entry.getValue()))
                .toList();
    }

    private LocalDate startOfWeek(LocalDate date) {
        LocalDate current = date;
        while (current.getDayOfWeek() != DayOfWeek.MONDAY) {
            current = current.minusDays(1);
        }
        return current;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "SIN REGISTRO";
        }
        return switch (status.trim().toUpperCase(CHILE)) {
            case "PRESENTE" -> "Presente";
            case "ATRASO", "ATRASADO" -> "Atraso";
            case "AUSENTE" -> "Ausente";
            case "SUSPENDIDO", "SUSPENSION", "SUSPENSIÓN" -> "Suspension";
            default -> "Sin registro";
        };
    }

    private String normalizeSpecialStatus(String activityCode) {
        if (activityCode == null || activityCode.isBlank()) {
            return "Sin registro";
        }
        return switch (activityCode.trim().toUpperCase(CHILE)) {
            case "VACACIONES" -> "Vacaciones";
            case "FERIADO" -> "Feriado";
            case "INTERFERIADO" -> "Interferiado";
            case "SUSPENSION" -> "Suspension";
            default -> "Sin registro";
        };
    }

    private String normalizeNote(String note) {
        return note == null || note.isBlank() ? "Sin observacion" : note.trim();
    }

    private String formatTime(Time time) {
        return time == null ? "" : TIME_FORMATTER.format(time.toLocalTime());
    }

    private String capitalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.substring(0, 1).toUpperCase(CHILE) + value.substring(1);
    }

    private record StudentContextRow(
            Long studentId,
            String studentName,
            Long courseId,
            String courseName,
            int schoolYear
    ) {
    }

    private record AttendanceWeekRow(
            LocalDate date,
            String status
    ) {
    }
}



