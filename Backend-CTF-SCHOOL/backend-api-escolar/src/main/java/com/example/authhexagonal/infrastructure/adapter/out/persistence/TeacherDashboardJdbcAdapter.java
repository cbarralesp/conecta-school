package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.TeacherAssignedCourse;
import com.example.authhexagonal.domain.model.TeacherDashboard;
import com.example.authhexagonal.domain.model.TeacherPlanningItem;
import com.example.authhexagonal.domain.model.TeacherScheduleItem;
import com.example.authhexagonal.domain.port.out.LoadTeacherDashboardPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class TeacherDashboardJdbcAdapter implements LoadTeacherDashboardPort {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final JdbcTemplate jdbcTemplate;

    public TeacherDashboardJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<TeacherDashboard> findByUsername(String username) {
        List<Map<String, Object>> teacherRows = jdbcTemplate.queryForList("""
                SELECT
                    pr."ID" AS teacher_id,
                    pr."CODIGO" AS teacher_code,
                    pr."ESPECIALIDAD" AS specialty,
                    pe."NOMBRES" AS first_names,
                    pe."APELLIDOS" AS last_names
                FROM "USUARIOS" u
                JOIN "PERSONAS" pe ON pe."ID" = u."PERSONA_ID"
                JOIN "PROFESORES" pr ON pr."PERSONA_ID" = pe."ID"
                WHERE u."USUARIO" = ?
                  AND u."ACTIVO" = TRUE
                  AND pr."ACTIVO" = TRUE
                """, username);

        if (teacherRows.isEmpty()) {
            return findDashboardFallbackByUsername(username);
        }

        Map<String, Object> teacher = teacherRows.getFirst();
        Long teacherId = ((Number) teacher.get("teacher_id")).longValue();

        List<TeacherAssignedCourse> assignedCourses = jdbcTemplate.query("""
                SELECT
                    cd."ID" AS load_id,
                    c."NOMBRE" AS course_name,
                    c."CODIGO" AS course_code,
                    a."NOMBRE" AS subject_name,
                    a."COLOR_HEX" AS color_hex,
                    cd."HORAS_SEMANALES" AS weekly_hours,
                    cd."ES_PROFESOR_JEFE" AS homeroom_teacher
                FROM "CARGAS_DOCENTES" cd
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                WHERE cd."PROFESOR_ID" = ?
                  AND cd."ACTIVA" = TRUE
                ORDER BY c."NOMBRE", a."NOMBRE"
                """, (rs, rowNum) -> new TeacherAssignedCourse(
                rs.getLong("load_id"),
                rs.getString("course_name"),
                rs.getString("course_code"),
                rs.getString("subject_name"),
                rs.getString("color_hex"),
                rs.getInt("weekly_hours"),
                rs.getBoolean("homeroom_teacher")
        ), teacherId);

        List<TeacherScheduleItem> weeklySchedule = jdbcTemplate.query("""
                SELECT
                    bh."DIA_SEMANA" AS day_of_week,
                    bh."HORA_INICIO" AS start_time,
                    bh."HORA_FIN" AS end_time,
                    c."NOMBRE" AS course_name,
                    a."NOMBRE" AS subject_name,
                    hc."SALA" AS room
                FROM "HORARIOS_CARGAS" hc
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = hc."CARGA_DOCENTE_ID"
                JOIN "BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                WHERE cd."PROFESOR_ID" = ?
                  AND cd."ACTIVA" = TRUE
                ORDER BY bh."ORDEN", bh."HORA_INICIO"
                """, (rs, rowNum) -> new TeacherScheduleItem(
                rs.getString("day_of_week"),
                formatTime(rs.getTime("start_time").toLocalTime()),
                formatTime(rs.getTime("end_time").toLocalTime()),
                rs.getString("course_name"),
                rs.getString("subject_name"),
                rs.getString("room")
        ), teacherId);

        List<TeacherPlanningItem> planningItems = jdbcTemplate.query("""
                SELECT
                    p."ID" AS planning_id,
                    p."TITULO" AS title,
                    p."UNIDAD" AS unit_name,
                    p."OBJETIVO_APRENDIZAJE" AS learning_objective,
                    p."ESTADO" AS status,
                    p."FECHA_CLASE" AS class_date,
                    c."NOMBRE" AS course_name,
                    a."NOMBRE" AS subject_name,
                    p."RECURSOS" AS resources,
                    p."ACTIVIDADES" AS activities,
                    p."EVALUACION" AS evaluation,
                    p."OBSERVACIONES" AS observations
                FROM "PLANIFICACIONES" p
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = p."CARGA_DOCENTE_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                WHERE cd."PROFESOR_ID" = ?
                ORDER BY p."FECHA_CLASE"
                """, (rs, rowNum) -> new TeacherPlanningItem(
                rs.getLong("planning_id"),
                rs.getString("title"),
                rs.getString("unit_name"),
                rs.getString("learning_objective"),
                rs.getString("status"),
                rs.getDate("class_date").toLocalDate(),
                rs.getString("course_name"),
                rs.getString("subject_name"),
                rs.getString("resources"),
                rs.getString("activities"),
                rs.getString("evaluation"),
                rs.getString("observations")
        ), teacherId);

        int pendingPlanningCount = (int) planningItems.stream()
                .filter(item -> !"COMPLETADA".equalsIgnoreCase(item.status()))
                .count();

        int assignedCoursesCount = (int) assignedCourses.stream()
                .map(TeacherAssignedCourse::courseCode)
                .filter(courseCode -> courseCode != null && !courseCode.isBlank())
                .distinct()
                .count();

        return Optional.of(new TeacherDashboard(
                (String) teacher.get("teacher_code"),
                teacher.get("first_names") + " " + teacher.get("last_names"),
                (String) teacher.get("specialty"),
                assignedCoursesCount,
                planningItems.size(),
                pendingPlanningCount,
                assignedCourses,
                weeklySchedule,
                List.of(),
                planningItems
        ));
    }

    private Optional<TeacherDashboard> findDashboardFallbackByUsername(String username) {
        return jdbcTemplate.query("""
                SELECT
                    u."USUARIO" AS username,
                    COALESCE(p."NOMBRES", '') AS first_names,
                    COALESCE(p."APELLIDOS", '') AS last_names,
                    COALESCE(r."CODIGO", '') AS role_code,
                    COALESCE(r."NOMBRE", '') AS role_name
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                LEFT JOIN "ADMIN_ROLES" r ON r."ID" = aus."ROL_ID"
                WHERE UPPER(u."USUARIO") = UPPER(?)
                  AND u."ACTIVO" = TRUE
                ORDER BY u."ID"
                LIMIT 1
                """, (rs, rowNum) -> new TeacherDashboard(
                rs.getString("username"),
                buildDisplayName(rs.getString("first_names"), rs.getString("last_names")),
                buildFallbackSpecialty(rs.getString("role_code"), rs.getString("role_name")),
                0,
                0,
                0,
                List.of(),
                List.of(),
                List.of(),
                List.of()
        ), username).stream().findFirst();
    }

    private String buildDisplayName(String firstNames, String lastNames) {
        String displayName = (safeValue(firstNames) + " " + safeValue(lastNames)).trim();
        return displayName.isBlank() ? "Usuario" : displayName;
    }

    private String buildFallbackSpecialty(String roleCode, String roleName) {
        String normalizedRoleCode = safeValue(roleCode).trim().toUpperCase();
        if ("PROFESOR".equals(normalizedRoleCode)) {
            return "Perfil docente activo";
        }
        if ("ADMIN".equals(normalizedRoleCode) || "SUPERADMIN".equals(normalizedRoleCode)) {
            return "Perfil administrativo activo";
        }

        String fallback = safeValue(roleName).trim();
        return fallback.isBlank() ? "Acceso institucional activo" : fallback;
    }

    private String safeValue(String value) {
        return value == null ? "" : value;
    }

    private String formatTime(LocalTime localTime) {
        return localTime.format(TIME_FORMATTER);
    }
}
