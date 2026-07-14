package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.PlanningSubjectFilter;
import com.example.authhexagonal.domain.model.PlanningSummaryFilter;
import com.example.authhexagonal.domain.model.PlanningSummaryMetrics;
import com.example.authhexagonal.domain.model.PlanningSummaryStatus;
import com.example.authhexagonal.domain.model.PlanningSummaryUnit;
import com.example.authhexagonal.domain.port.out.PlanningSummaryRepositoryPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Lectura agregada del dashboard semestral de planificacion usando JdbcTemplate.
 */
@Component
public class PlanningSummaryJdbcAdapter implements PlanningSummaryRepositoryPort {

    private static final Logger LOGGER = LoggerFactory.getLogger(PlanningSummaryJdbcAdapter.class);

    private final JdbcTemplate jdbcTemplate;

    public PlanningSummaryJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public PlanningSummaryMetrics findMetrics(String username, PlanningSummaryFilter filter) {
        QueryParts query = buildBaseQuery(username, filter);
        String baseSql = stripAccessCte(query.sql());
        String sql = accessCte() + """
                SELECT
                    COUNT(*) AS total_units,
                    COALESCE(SUM(unit_row.total_classes), 0) AS total_classes,
                    COALESCE(SUM(unit_row.published_classes), 0) AS published_classes,
                    COALESCE(SUM(unit_row.total_documents), 0) AS total_documents,
                    COALESCE(SUM(unit_row.visible_documents), 0) AS visible_documents,
                    CASE
                        WHEN COALESCE(SUM(unit_row.total_classes), 0) <= 0 THEN
                            CASE WHEN COALESCE(SUM(unit_row.published_classes), 0) > 0 THEN 100 ELSE 0 END
                        ELSE LEAST(
                            100,
                            ROUND(
                                (COALESCE(SUM(unit_row.published_classes), 0)::numeric
                                / NULLIF(SUM(unit_row.total_classes), 0)::numeric) * 100
                            )::int
                        )
                    END AS semester_progress
                FROM (
                """ + baseSql + """
                ) unit_row
                """;

        LOGGER.info("Consultando metricas del resumen semestral para usuario={}", username);
        return jdbcTemplate.query(sql, (rs, rowNum) -> new PlanningSummaryMetrics(
                rs.getInt("total_units"),
                rs.getInt("total_classes"),
                rs.getInt("published_classes"),
                rs.getInt("total_documents"),
                rs.getInt("visible_documents"),
                rs.getInt("semester_progress")
        ), query.args().toArray()).stream().findFirst().orElse(new PlanningSummaryMetrics(0, 0, 0, 0, 0, 0));
    }

    @Override
    public List<PlanningSubjectFilter> findSubjects(String username, PlanningSummaryFilter filter) {
        StringBuilder sql = new StringBuilder();
        List<Object> args = new ArrayList<>();
        sql.append(accessCte());
        sql.append("""
                SELECT DISTINCT
                    a."ID" AS subject_id,
                    a."NOMBRE" AS subject_name
                FROM app_user
                JOIN "UNIDADES_PLANIFICACION" up ON 1 = 1
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                WHERE 1 = 1
                """);
        args.add(username);

        appendYearFilter(sql, args, filter);
        sql.append(" ORDER BY a.\"NOMBRE\"");
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new PlanningSubjectFilter(
                rs.getLong("subject_id"),
                rs.getString("subject_name")
        ), args.toArray());
    }

    @Override
    public List<PlanningSummaryUnit> findUnits(String username, PlanningSummaryFilter filter) {
        QueryParts query = buildBaseQuery(username, filter);
        String sql = query.sql() + " ORDER BY start_date DESC, id DESC";
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapSummaryUnit(rs), query.args().toArray());
    }

    private QueryParts buildBaseQuery(String username, PlanningSummaryFilter filter) {
        StringBuilder sql = new StringBuilder();
        List<Object> args = new ArrayList<>();

        sql.append(accessCte());
        sql.append("""
                SELECT
                    up."ID" AS id,
                    up."NUMERO_UNIDAD" AS unit_code,
                    up."NOMBRE" AS unit_name,
                    COALESCE(up."COLOR_HEX", '#6d28d9') AS unit_color_hex,
                    a."ID" AS subject_id,
                    a."NOMBRE" AS subject_name,
                    COALESCE(a."COLOR_HEX", '#7c3aed') AS subject_color_hex,
                    c."NOMBRE" AS course_name,
                    up."SEMANA_INICIO" AS start_week,
                    up."FECHA_INICIO" AS start_date,
                    up."FECHA_TERMINO" AS end_date,
                    up."SEMANAS_ESTIMADAS" AS estimated_weeks,
                    COALESCE(up."CLASES_PLANIFICADAS", 0) AS planned_classes,
                    COUNT(DISTINCT cp."ID") AS total_classes,
                    COUNT(DISTINCT CASE WHEN cp."ESTADO" = 'PUBLICADA' THEN cp."ID" END) AS published_classes,
                    COUNT(DISTINCT pd."ID") AS total_documents,
                    COUNT(DISTINCT CASE WHEN pd."VISIBLE_ALUMNOS" = TRUE THEN pd."ID" END) AS visible_documents
                FROM app_user
                JOIN "UNIDADES_PLANIFICACION" up ON 1 = 1
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                LEFT JOIN "CLASES_PLANIFICACION" cp ON cp."UNIDAD_ID" = up."ID"
                LEFT JOIN "CLASES_PLANIFICACION_DOCUMENTOS" pd
                    ON pd."UNIDAD_ID" = up."ID"
                   AND COALESCE(pd."ELIMINADO", FALSE) = FALSE
                   AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
                WHERE 1 = 1
                """);
        args.add(username);

        if (filter.documentType() != null) {
            sql.append("""
                     AND COALESCE(pd."TIPO_ARCHIVO", CASE
                        WHEN LOWER(pd."EXTENSION") IN ('doc', 'docx') THEN 'WORD'
                        WHEN LOWER(pd."EXTENSION") = 'pdf' THEN 'PDF'
                        WHEN LOWER(pd."EXTENSION") IN ('ppt', 'pptx') THEN 'PPT'
                        ELSE 'OTRO'
                    END) = ?
                    """);
            args.add(filter.documentType().name());
        }

        appendYearFilter(sql, args, filter);

        if (filter.subjectId() != null) {
            sql.append(" AND a.\"ID\" = ?");
            args.add(filter.subjectId());
        }

        if (filter.courseId() != null) {
            sql.append(" AND c.\"ID\" = ?");
            args.add(filter.courseId());
        }

        if (filter.semester() != null) {
            if (filter.semester() == 1) {
                sql.append("""
                         AND EXTRACT(MONTH FROM COALESCE(cp."FECHA_PLANIFICADA", up."FECHA_INICIO"))
                             BETWEEN 1 AND 6
                        """);
            } else if (filter.semester() == 2) {
                sql.append("""
                         AND EXTRACT(MONTH FROM COALESCE(cp."FECHA_PLANIFICADA", up."FECHA_INICIO"))
                             BETWEEN 7 AND 12
                        """);
            }
        }

        if (filter.month() != null) {
            sql.append("""
                     AND EXTRACT(MONTH FROM COALESCE(cp."FECHA_PLANIFICADA", up."FECHA_INICIO")) = ?
                    """);
            args.add(filter.month());
        }

        if (filter.status() != null) {
            sql.append(" AND cp.\"ESTADO\" = ?");
            args.add(filter.status().name());
        }

        if (filter.documentType() != null) {
            sql.append("""
                     AND EXISTS (
                        SELECT 1
                        FROM "CLASES_PLANIFICACION_DOCUMENTOS" pd_filter
                        WHERE pd_filter."UNIDAD_ID" = up."ID"
                          AND COALESCE(pd_filter."ELIMINADO", FALSE) = FALSE
                          AND COALESCE(pd_filter."ESTADO", 'ACTIVO') = 'ACTIVO'
                          AND COALESCE(pd_filter."TIPO_ARCHIVO", CASE
                              WHEN LOWER(pd_filter."EXTENSION") IN ('doc', 'docx') THEN 'WORD'
                              WHEN LOWER(pd_filter."EXTENSION") = 'pdf' THEN 'PDF'
                              WHEN LOWER(pd_filter."EXTENSION") IN ('ppt', 'pptx') THEN 'PPT'
                              ELSE 'OTRO'
                          END) = ?
                    )
                    """);
            args.add(filter.documentType().name());
        }

        sql.append("""
                
                GROUP BY
                    up."ID",
                    up."NUMERO_UNIDAD",
                    up."NOMBRE",
                    up."COLOR_HEX",
                    a."ID",
                    a."NOMBRE",
                    a."COLOR_HEX",
                    c."NOMBRE",
                    up."SEMANA_INICIO",
                    up."FECHA_INICIO",
                    up."FECHA_TERMINO",
                    up."SEMANAS_ESTIMADAS",
                    up."CLASES_PLANIFICADAS"
                """);
        return new QueryParts(sql.toString(), args);
    }

    private void appendYearFilter(StringBuilder sql, List<Object> args, PlanningSummaryFilter filter) {
        if (filter.year() != null) {
            sql.append(" AND cd.\"ANIO_ESCOLAR\" = ?");
            args.add(filter.year());
        }
    }

    private PlanningSummaryUnit mapSummaryUnit(ResultSet rs) throws SQLException {
        int plannedClasses = rs.getInt("planned_classes");
        int totalClasses = rs.getInt("total_classes");
        int publishedClasses = rs.getInt("published_classes");
        int progressPercent;
        if (totalClasses <= 0) {
            progressPercent = publishedClasses > 0 ? 100 : 0;
        } else {
            progressPercent = Math.min(100, (int) Math.round((publishedClasses * 100.0) / totalClasses));
        }

        PlanningSummaryStatus status = progressPercent <= 0
                ? PlanningSummaryStatus.PENDIENTE
                : progressPercent >= 100 ? PlanningSummaryStatus.COMPLETADA : PlanningSummaryStatus.ACTIVA;

        Integer startWeek = (Integer) rs.getObject("start_week");
        int estimatedWeeks = rs.getInt("estimated_weeks");
        String weekRange;
        if (startWeek != null && startWeek > 0 && estimatedWeeks > 0) {
            weekRange = startWeek + "-" + (startWeek + estimatedWeeks - 1);
        } else if (rs.getDate("start_date") != null && rs.getDate("end_date") != null) {
            weekRange = rs.getDate("start_date").toLocalDate().getDayOfMonth()
                    + "-" + rs.getDate("end_date").toLocalDate().getDayOfMonth();
        } else {
            weekRange = "-";
        }

        return new PlanningSummaryUnit(
                rs.getLong("id"),
                compactUnitCode(rs.getString("unit_code")),
                rs.getString("unit_name"),
                rs.getString("unit_color_hex"),
                rs.getLong("subject_id"),
                rs.getString("subject_name"),
                rs.getString("subject_color_hex"),
                rs.getString("course_name"),
                plannedClasses,
                rs.getInt("total_classes"),
                publishedClasses,
                rs.getInt("total_documents"),
                rs.getDate("start_date") == null ? null : rs.getDate("start_date").toLocalDate(),
                rs.getDate("end_date") == null ? null : rs.getDate("end_date").toLocalDate(),
                weekRange,
                progressPercent,
                status
        );
    }

    private String compactUnitCode(String unitCode) {
        return switch (unitCode) {
            case "UNIDAD_I" -> "U1";
            case "UNIDAD_II" -> "U2";
            case "UNIDAD_III" -> "U3";
            case "UNIDAD_IV" -> "U4";
            case "UNIDAD_V" -> "U5";
            case "UNIDAD_VI" -> "U6";
            case "UNIDAD_VII" -> "U7";
            case "UNIDAD_VIII" -> "U8";
            default -> unitCode;
        };
    }

    private String accessCte() {
        return """
                WITH app_user AS (
                    SELECT
                        u."PERSONA_ID" AS persona_id,
                        COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
                    FROM "USUARIOS" u
                    LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                    LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
                    WHERE u."USUARIO" = ?
                )
                """;
    }

    private String stripAccessCte(String sql) {
        String cte = accessCte();
        return sql.startsWith(cte) ? sql.substring(cte.length()) : sql;
    }

    private record QueryParts(String sql, List<Object> args) {
    }
}
