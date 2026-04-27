package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.TeacherPlanningDetail;
import com.example.authhexagonal.domain.port.out.ManageTeacherPlanningPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
public class TeacherPlanningJdbcAdapter implements ManageTeacherPlanningPort {

    private final JdbcTemplate jdbcTemplate;

    public TeacherPlanningJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<TeacherPlanningDetail> findPlanningByUsernameAndId(String username, Long planningId) {
        return loadPlanning(username, planningId);
    }

    @Override
    public Optional<TeacherPlanningDetail> updatePlanning(
            String username,
            Long planningId,
            String title,
            String unit,
            String learningObjective,
            String status,
            LocalDate classDate,
            String resources,
            String activities,
            String evaluation,
            String observations
    ) {
        int updated = jdbcTemplate.update("""
                UPDATE "PLANIFICACIONES" p
                SET "TITULO" = ?,
                    "UNIDAD" = ?,
                    "OBJETIVO_APRENDIZAJE" = ?,
                    "ESTADO" = ?,
                    "FECHA_CLASE" = ?,
                    "RECURSOS" = ?,
                    "ACTIVIDADES" = ?,
                    "EVALUACION" = ?,
                    "OBSERVACIONES" = ?
                FROM "CARGAS_DOCENTES" cd
                JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                JOIN "USUARIOS" u ON u."PERSONA_ID" = pr."PERSONA_ID"
                WHERE p."ID" = ?
                  AND p."CARGA_DOCENTE_ID" = cd."ID"
                  AND u."USUARIO" = ?
                """,
                title,
                unit,
                learningObjective,
                status,
                classDate,
                resources,
                activities,
                evaluation,
                observations,
                planningId,
                username
        );

        if (updated == 0) {
            return Optional.empty();
        }

        return loadPlanning(username, planningId);
    }

    private Optional<TeacherPlanningDetail> loadPlanning(String username, Long planningId) {
        List<TeacherPlanningDetail> results = jdbcTemplate.query("""
                SELECT
                    p."ID" AS planning_id,
                    p."TITULO" AS title,
                    p."UNIDAD" AS unit_name,
                    p."OBJETIVO_APRENDIZAJE" AS learning_objective,
                    p."ESTADO" AS status,
                    p."FECHA_CLASE" AS class_date,
                    c."NOMBRE" AS course_name,
                    a."NOMBRE" AS subject_name,
                    pe."NOMBRES" || ' ' || pe."APELLIDOS" AS teacher_name,
                    p."RECURSOS" AS resources,
                    p."ACTIVIDADES" AS activities,
                    p."EVALUACION" AS evaluation,
                    p."OBSERVACIONES" AS observations
                FROM "PLANIFICACIONES" p
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = p."CARGA_DOCENTE_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                JOIN "PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
                JOIN "USUARIOS" u ON u."PERSONA_ID" = pe."ID"
                WHERE u."USUARIO" = ?
                  AND p."ID" = ?
                """, this::mapPlanning, username, planningId);

        return results.stream().findFirst();
    }

    private TeacherPlanningDetail mapPlanning(ResultSet rs, int rowNum) throws SQLException {
        return new TeacherPlanningDetail(
                rs.getLong("planning_id"),
                rs.getString("title"),
                rs.getString("unit_name"),
                rs.getString("learning_objective"),
                rs.getString("status"),
                rs.getDate("class_date").toLocalDate(),
                rs.getString("course_name"),
                rs.getString("subject_name"),
                rs.getString("teacher_name"),
                rs.getString("resources"),
                rs.getString("activities"),
                rs.getString("evaluation"),
                rs.getString("observations")
        );
    }
}
