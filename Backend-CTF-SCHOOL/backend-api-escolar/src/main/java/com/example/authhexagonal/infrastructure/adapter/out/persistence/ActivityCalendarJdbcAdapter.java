package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.ActivityType;
import com.example.authhexagonal.domain.model.SchoolActivity;
import com.example.authhexagonal.domain.port.out.ManageActivityCalendarPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
public class ActivityCalendarJdbcAdapter implements ManageActivityCalendarPort {

    private final JdbcTemplate jdbcTemplate;

    public ActivityCalendarJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<ActivityType> findActiveTypes() {
        return jdbcTemplate.query("""
                SELECT "ID", "CODIGO", "NOMBRE", "DESCRIPCION", "COLOR_FONDO", "COLOR_TEXTO", "ICONO"
                FROM "TIPOS_ACTIVIDAD"
                WHERE "ACTIVO" = TRUE
                ORDER BY "NOMBRE"
                """, (rs, rowNum) -> mapType(rs));
    }

    @Override
    public Optional<ActivityType> findActiveTypeById(Long activityTypeId) {
        return jdbcTemplate.query("""
                SELECT "ID", "CODIGO", "NOMBRE", "DESCRIPCION", "COLOR_FONDO", "COLOR_TEXTO", "ICONO"
                FROM "TIPOS_ACTIVIDAD"
                WHERE "ID" = ?
                  AND "ACTIVO" = TRUE
                """, (rs, rowNum) -> mapType(rs), activityTypeId).stream().findFirst();
    }

    @Override
    public Optional<SchoolActivity> findActiveById(Long activityId) {
        return jdbcTemplate.query("""
                SELECT
                    a."ID",
                    a."TIPO_ACTIVIDAD_ID",
                    a."CURSO_ID",
                    c."NOMBRE" || CASE WHEN COALESCE(c."LETRA", '') <> '' THEN ' ' || c."LETRA" ELSE '' END AS course_name,
                    t."CODIGO" AS type_code,
                    t."NOMBRE" AS type_name,
                    a."TITULO",
                    a."DESCRIPCION",
                    a."FECHA",
                    a."FECHA_FIN",
                    a."HORA",
                    a."UBICACION",
                    t."COLOR_FONDO",
                    t."COLOR_TEXTO",
                    t."ICONO"
                FROM "ACTIVIDADES_ESCOLARES" a
                JOIN "TIPOS_ACTIVIDAD" t ON t."ID" = a."TIPO_ACTIVIDAD_ID"
                LEFT JOIN "CURSOS" c ON c."ID" = a."CURSO_ID"
                WHERE a."ID" = ?
                  AND a."ACTIVO" = TRUE
                  AND t."ACTIVO" = TRUE
                """, (rs, rowNum) -> mapActivity(rs), activityId).stream().findFirst();
    }

    @Override
    public List<SchoolActivity> findActivitiesForRange(LocalDate startDate, LocalDate endDate, Long courseId) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    a."ID",
                    a."TIPO_ACTIVIDAD_ID",
                    a."CURSO_ID",
                    c."NOMBRE" || CASE WHEN COALESCE(c."LETRA", '') <> '' THEN ' ' || c."LETRA" ELSE '' END AS course_name,
                    t."CODIGO" AS type_code,
                    t."NOMBRE" AS type_name,
                    a."TITULO",
                    a."DESCRIPCION",
                    a."FECHA",
                    a."FECHA_FIN",
                    a."HORA",
                    a."UBICACION",
                    t."COLOR_FONDO",
                    t."COLOR_TEXTO",
                    t."ICONO"
                FROM "ACTIVIDADES_ESCOLARES" a
                JOIN "TIPOS_ACTIVIDAD" t ON t."ID" = a."TIPO_ACTIVIDAD_ID"
                LEFT JOIN "CURSOS" c ON c."ID" = a."CURSO_ID"
                WHERE a."ACTIVO" = TRUE
                  AND t."ACTIVO" = TRUE
                  AND a."FECHA" <= ?
                  AND COALESCE(a."FECHA_FIN", a."FECHA") >= ?
                """);

        List<Object> args = new ArrayList<>();
        args.add(endDate);
        args.add(startDate);
        if (courseId != null) {
            sql.append(" AND (a.\"CURSO_ID\" = ? OR a.\"CURSO_ID\" IS NULL)");
            args.add(courseId);
        }
        sql.append(" ORDER BY a.\"FECHA\", a.\"HORA\" NULLS LAST, a.\"TITULO\"");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapActivity(rs), args.toArray());
    }

    @Override
    public List<SchoolActivity> findUpcomingActivities(LocalDate startDate, int limit, Long courseId) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    a."ID",
                    a."TIPO_ACTIVIDAD_ID",
                    a."CURSO_ID",
                    c."NOMBRE" || CASE WHEN COALESCE(c."LETRA", '') <> '' THEN ' ' || c."LETRA" ELSE '' END AS course_name,
                    t."CODIGO" AS type_code,
                    t."NOMBRE" AS type_name,
                    a."TITULO",
                    a."DESCRIPCION",
                    a."FECHA",
                    a."FECHA_FIN",
                    a."HORA",
                    a."UBICACION",
                    t."COLOR_FONDO",
                    t."COLOR_TEXTO",
                    t."ICONO"
                FROM "ACTIVIDADES_ESCOLARES" a
                JOIN "TIPOS_ACTIVIDAD" t ON t."ID" = a."TIPO_ACTIVIDAD_ID"
                LEFT JOIN "CURSOS" c ON c."ID" = a."CURSO_ID"
                WHERE a."ACTIVO" = TRUE
                  AND t."ACTIVO" = TRUE
                  AND COALESCE(a."FECHA_FIN", a."FECHA") >= ?
                """);

        List<Object> args = new ArrayList<>();
        args.add(startDate);
        if (courseId != null) {
            sql.append(" AND (a.\"CURSO_ID\" = ? OR a.\"CURSO_ID\" IS NULL)");
            args.add(courseId);
        }
        sql.append(" ORDER BY a.\"FECHA\", a.\"HORA\" NULLS LAST, a.\"TITULO\" LIMIT ?");
        args.add(limit);

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapActivity(rs), args.toArray());
    }

    @Override
    public SchoolActivity createActivity(
            Long activityTypeId,
            Long courseId,
            String title,
            String description,
            LocalDate date,
            LocalDate endDate,
            LocalTime time,
            String location
    ) {
        Long activityId = jdbcTemplate.queryForObject("""
                INSERT INTO "ACTIVIDADES_ESCOLARES" (
                    "TIPO_ACTIVIDAD_ID",
                    "CURSO_ID",
                    "TITULO",
                    "DESCRIPCION",
                    "FECHA",
                    "FECHA_FIN",
                    "HORA",
                    "UBICACION",
                    "ACTIVO"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                RETURNING "ID"
                """, Long.class, activityTypeId, courseId, title, description, date, endDate, time, location);

        return findActiveById(activityId).orElseThrow();
    }

    @Override
    public SchoolActivity updateActivity(
            Long activityId,
            Long activityTypeId,
            Long courseId,
            String title,
            String description,
            LocalDate date,
            LocalDate endDate,
            LocalTime time,
            String location
    ) {
        jdbcTemplate.update("""
                UPDATE "ACTIVIDADES_ESCOLARES"
                SET "TIPO_ACTIVIDAD_ID" = ?,
                    "CURSO_ID" = ?,
                    "TITULO" = ?,
                    "DESCRIPCION" = ?,
                    "FECHA" = ?,
                    "FECHA_FIN" = ?,
                    "HORA" = ?,
                    "UBICACION" = ?
                WHERE "ID" = ?
                  AND "ACTIVO" = TRUE
                """, activityTypeId, courseId, title, description, date, endDate, time, location, activityId);

        return findActiveById(activityId).orElseThrow();
    }

    @Override
    public void deactivateActivity(Long activityId) {
        jdbcTemplate.update("""
                UPDATE "ACTIVIDADES_ESCOLARES"
                SET "ACTIVO" = FALSE
                WHERE "ID" = ?
                """, activityId);
    }

    private ActivityType mapType(ResultSet rs) throws SQLException {
        return new ActivityType(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getString("DESCRIPCION"),
                rs.getString("COLOR_FONDO"),
                rs.getString("COLOR_TEXTO"),
                rs.getString("ICONO")
        );
    }

    private SchoolActivity mapActivity(ResultSet rs) throws SQLException {
        return new SchoolActivity(
                rs.getLong("ID"),
                rs.getLong("TIPO_ACTIVIDAD_ID"),
                rs.getObject("CURSO_ID", Long.class),
                rs.getString("course_name"),
                rs.getString("type_code"),
                rs.getString("type_name"),
                rs.getString("TITULO"),
                rs.getString("DESCRIPCION"),
                rs.getDate("FECHA").toLocalDate(),
                rs.getDate("FECHA_FIN") == null ? null : rs.getDate("FECHA_FIN").toLocalDate(),
                rs.getTime("HORA") == null ? null : rs.getTime("HORA").toLocalTime(),
                rs.getString("UBICACION"),
                rs.getString("COLOR_FONDO"),
                rs.getString("COLOR_TEXTO"),
                rs.getString("ICONO")
        );
    }
}
