package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.PlanningUnit;
import com.example.authhexagonal.domain.model.PlanningUnitCatalogAssignment;
import com.example.authhexagonal.domain.model.PlanningUnitStatus;
import com.example.authhexagonal.domain.model.PlanningUnitSummary;
import com.example.authhexagonal.domain.port.out.PlanningCatalogRepositoryPort;
import com.example.authhexagonal.domain.port.out.PlanningUnitRepositoryPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
public class PlanningJdbcAdapter implements PlanningUnitRepositoryPort, PlanningCatalogRepositoryPort {

    private final JdbcTemplate jdbcTemplate;

    public PlanningJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<PlanningUnitCatalogAssignment> findAvailableAssignments(String username) {
        return jdbcTemplate.query("""
                WITH app_user AS (
                    SELECT
                        u."ID" AS user_id,
                        u."PERSONA_ID" AS persona_id,
                        COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
                    FROM "USUARIOS" u
                    LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                    LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
                    WHERE u."USUARIO" = ?
                )
                SELECT DISTINCT
                    cd."ID" AS load_id,
                    a."ID" AS subject_id,
                    a."CODIGO" AS subject_code,
                    a."NOMBRE" AS subject_name,
                    COALESCE(a."COLOR_HEX", '#2955ea') AS subject_color_hex,
                    c."ID" AS course_id,
                    c."CODIGO" AS course_code,
                    c."NOMBRE" AS course_name,
                    cd."ANIO_ESCOLAR" AS school_year,
                    cd."ES_PROFESOR_JEFE" AS homeroom_teacher
                FROM app_user cu
                JOIN "CARGAS_DOCENTES" cd ON cd."ACTIVA" = TRUE
                JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID" AND a."ACTIVA" = TRUE
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID" AND c."ACTIVO" = TRUE
                WHERE (
                    cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')
                    OR pr."PERSONA_ID" = cu.persona_id
                )
                ORDER BY school_year DESC, course_name, subject_name
                """, (rs, rowNum) -> new PlanningUnitCatalogAssignment(
                rs.getLong("load_id"),
                rs.getLong("subject_id"),
                rs.getString("subject_code"),
                rs.getString("subject_name"),
                rs.getString("subject_color_hex"),
                rs.getLong("course_id"),
                rs.getString("course_code"),
                rs.getString("course_name"),
                rs.getInt("school_year"),
                rs.getBoolean("homeroom_teacher")
        ), username);
    }

    @Override
    public Optional<Long> findUserIdByUsername(String username) {
        return jdbcTemplate.query("""
                SELECT "ID"
                FROM "USUARIOS"
                WHERE "USUARIO" = ?
                """, (rs, rowNum) -> rs.getLong("ID"), username).stream().findFirst();
    }

    @Override
    public PlanningUnit createUnit(
            Long loadId,
            String unitNumber,
            String name,
            Integer startWeek,
            LocalDate startDate,
            LocalDate endDate,
            int estimatedWeeks,
            int plannedClasses,
            String generalDescription,
            String learningObjectives,
            String achievementIndicators,
            PlanningUnitStatus status,
            Long createdByUserId
    ) {
        syncSequence("UNIDADES_PLANIFICACION", "ID");

        Long unitId = jdbcTemplate.queryForObject("""
                INSERT INTO "UNIDADES_PLANIFICACION" (
                    "CARGA_DOCENTE_ID",
                    "NUMERO_UNIDAD",
                    "NOMBRE",
                    "SEMANA_INICIO",
                    "FECHA_INICIO",
                    "FECHA_TERMINO",
                    "SEMANAS_ESTIMADAS",
                    "CLASES_PLANIFICADAS",
                    "DESCRIPCION_GENERAL",
                    "OBJETIVOS_APRENDIZAJE",
                    "INDICADORES_LOGRO",
                    "ESTADO",
                    "CREADO_POR_USUARIO_ID"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING "ID"
                """, Long.class,
                loadId,
                unitNumber,
                name,
                startWeek,
                startDate,
                endDate,
                estimatedWeeks,
                plannedClasses,
                generalDescription,
                learningObjectives,
                achievementIndicators,
                status.name(),
                createdByUserId
        );

        return findById(unitId).orElseThrow();
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

    @Override
    public PlanningUnit updateUnit(Long unitId, String unitNumber, String name) {
        jdbcTemplate.update("""
                UPDATE "UNIDADES_PLANIFICACION"
                SET "NUMERO_UNIDAD" = ?,
                    "NOMBRE" = ?,
                    "FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP
                WHERE "ID" = ?
                """, unitNumber, name, unitId);

        return findById(unitId).orElseThrow();
    }

    @Override
    public PlanningUnit updateUnitDetails(
            Long unitId,
            String unitNumber,
            String name,
            Integer startWeek,
            LocalDate startDate,
            LocalDate endDate,
            int estimatedWeeks,
            int plannedClasses,
            String generalDescription,
            String learningObjectives,
            String achievementIndicators
    ) {
        jdbcTemplate.update("""
                UPDATE "UNIDADES_PLANIFICACION"
                SET "NUMERO_UNIDAD" = ?,
                    "NOMBRE" = ?,
                    "SEMANA_INICIO" = ?,
                    "FECHA_INICIO" = ?,
                    "FECHA_TERMINO" = ?,
                    "SEMANAS_ESTIMADAS" = ?,
                    "CLASES_PLANIFICADAS" = ?,
                    "DESCRIPCION_GENERAL" = ?,
                    "OBJETIVOS_APRENDIZAJE" = ?,
                    "INDICADORES_LOGRO" = ?,
                    "FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP
                WHERE "ID" = ?
                """,
                unitNumber,
                name,
                startWeek,
                startDate,
                endDate,
                estimatedWeeks,
                plannedClasses,
                generalDescription,
                learningObjectives,
                achievementIndicators,
                unitId
        );

        return findById(unitId).orElseThrow();
    }

    @Override
    public boolean hasClasses(Long unitId) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "CLASES_PLANIFICACION"
                WHERE "UNIDAD_ID" = ?
                """, Integer.class, unitId);
        return count != null && count > 0;
    }

    @Override
    public void deleteUnit(Long unitId) {
        jdbcTemplate.update("""
                DELETE FROM "UNIDADES_PLANIFICACION"
                WHERE "ID" = ?
                """, unitId);
    }

    @Override
    public List<PlanningUnitSummary> findUnitsByUsername(String username) {
        return jdbcTemplate.query("""
                WITH app_user AS (
                    SELECT
                        u."PERSONA_ID" AS persona_id,
                        COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
                    FROM "USUARIOS" u
                    LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                    LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
                    WHERE u."USUARIO" = ?
                )
                SELECT
                    up."ID",
                    up."NUMERO_UNIDAD",
                    up."NOMBRE",
                    a."NOMBRE" AS subject_name,
                    c."NOMBRE" AS course_name,
                    up."ESTADO",
                    up."FECHA_INICIO",
                    up."FECHA_TERMINO"
                FROM app_user cu
                JOIN "UNIDADES_PLANIFICACION" up ON 1 = 1
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                WHERE (
                    cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')
                    OR pr."PERSONA_ID" = cu.persona_id
                )
                ORDER BY up."FECHA_CREACION" DESC, up."ID" DESC
                """, (rs, rowNum) -> new PlanningUnitSummary(
                rs.getLong("ID"),
                resolveUnitNumberLabel(rs.getString("NUMERO_UNIDAD")),
                rs.getString("NOMBRE"),
                rs.getString("subject_name"),
                rs.getString("course_name"),
                PlanningUnitStatus.valueOf(rs.getString("ESTADO")),
                rs.getDate("FECHA_INICIO").toLocalDate(),
                rs.getDate("FECHA_TERMINO").toLocalDate()
        ), username);
    }

    @Override
    public Optional<PlanningUnit> findById(Long unitId) {
        return jdbcTemplate.query("""
                SELECT
                    up."ID",
                    up."CARGA_DOCENTE_ID",
                    a."ID" AS subject_id,
                    a."NOMBRE" AS subject_name,
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    up."NUMERO_UNIDAD",
                    up."NOMBRE",
                    up."SEMANA_INICIO",
                    up."FECHA_INICIO",
                    up."FECHA_TERMINO",
                    up."SEMANAS_ESTIMADAS",
                    up."CLASES_PLANIFICADAS",
                    COALESCE(up."DESCRIPCION_GENERAL", '') AS description_general,
                    COALESCE(up."OBJETIVOS_APRENDIZAJE", '') AS learning_objectives,
                    COALESCE(up."INDICADORES_LOGRO", '') AS achievement_indicators,
                    up."ESTADO",
                    u."USUARIO" AS created_by,
                    up."FECHA_CREACION",
                    up."FECHA_ACTUALIZACION"
                FROM "UNIDADES_PLANIFICACION" up
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                JOIN "USUARIOS" u ON u."ID" = up."CREADO_POR_USUARIO_ID"
                WHERE up."ID" = ?
                """, this::mapPlanningUnit, unitId).stream().findFirst();
    }

    @Override
    public Optional<PlanningUnit> findAccessibleById(String username, Long unitId) {
        return jdbcTemplate.query("""
                WITH app_user AS (
                    SELECT
                        u."PERSONA_ID" AS persona_id,
                        COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
                    FROM "USUARIOS" u
                    LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                    LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
                    WHERE u."USUARIO" = ?
                )
                SELECT
                    up."ID",
                    up."CARGA_DOCENTE_ID",
                    a."ID" AS subject_id,
                    a."NOMBRE" AS subject_name,
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    up."NUMERO_UNIDAD",
                    up."NOMBRE",
                    up."SEMANA_INICIO",
                    up."FECHA_INICIO",
                    up."FECHA_TERMINO",
                    up."SEMANAS_ESTIMADAS",
                    up."CLASES_PLANIFICADAS",
                    COALESCE(up."DESCRIPCION_GENERAL", '') AS description_general,
                    COALESCE(up."OBJETIVOS_APRENDIZAJE", '') AS learning_objectives,
                    COALESCE(up."INDICADORES_LOGRO", '') AS achievement_indicators,
                    up."ESTADO",
                    creator."USUARIO" AS created_by,
                    up."FECHA_CREACION",
                    up."FECHA_ACTUALIZACION"
                FROM app_user cu
                JOIN "UNIDADES_PLANIFICACION" up ON up."ID" = ?
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                JOIN "USUARIOS" creator ON creator."ID" = up."CREADO_POR_USUARIO_ID"
                WHERE (
                    cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')
                    OR pr."PERSONA_ID" = cu.persona_id
                )
                """, this::mapPlanningUnit, username, unitId).stream().findFirst();
    }

    private PlanningUnit mapPlanningUnit(ResultSet rs, int rowNum) throws SQLException {
        return new PlanningUnit(
                rs.getLong("ID"),
                rs.getLong("CARGA_DOCENTE_ID"),
                rs.getLong("subject_id"),
                rs.getString("subject_name"),
                rs.getLong("course_id"),
                rs.getString("course_name"),
                rs.getString("NUMERO_UNIDAD"),
                resolveUnitNumberLabel(rs.getString("NUMERO_UNIDAD")),
                rs.getString("NOMBRE"),
                rs.getObject("SEMANA_INICIO", Integer.class),
                rs.getDate("FECHA_INICIO").toLocalDate(),
                rs.getDate("FECHA_TERMINO").toLocalDate(),
                rs.getInt("SEMANAS_ESTIMADAS"),
                rs.getInt("CLASES_PLANIFICADAS"),
                rs.getString("description_general"),
                rs.getString("learning_objectives"),
                rs.getString("achievement_indicators"),
                PlanningUnitStatus.valueOf(rs.getString("ESTADO")),
                rs.getString("created_by"),
                rs.getTimestamp("FECHA_CREACION").toLocalDateTime(),
                rs.getTimestamp("FECHA_ACTUALIZACION").toLocalDateTime()
        );
    }

    private String resolveUnitNumberLabel(String unitNumber) {
        return switch (unitNumber) {
            case "UNIDAD_I" -> "Unidad I";
            case "UNIDAD_II" -> "Unidad II";
            case "UNIDAD_III" -> "Unidad III";
            case "UNIDAD_IV" -> "Unidad IV";
            case "UNIDAD_V" -> "Unidad V";
            case "UNIDAD_VI" -> "Unidad VI";
            case "UNIDAD_VII" -> "Unidad VII";
            case "UNIDAD_VIII" -> "Unidad VIII";
            default -> unitNumber;
        };
    }
}
