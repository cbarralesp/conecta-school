package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.StudyProgramDetail;
import com.example.authhexagonal.domain.model.StudyProgramSummary;
import com.example.authhexagonal.domain.port.out.StudyProgramRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class StudyProgramJdbcAdapter implements StudyProgramRepository {

    private final JdbcTemplate jdbcTemplate;

    public StudyProgramJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<StudyProgramSummary> findAllPrograms() {
        return jdbcTemplate.query("""
                SELECT
                    "ID",
                    "CODIGO",
                    "ASIGNATURA",
                    "GRADO",
                    "DECRETO",
                    "FUENTE",
                    "EDICION",
                    "TOTAL_UNIDADES",
                    "TOTAL_OAS",
                    "HORAS_TOTALES"
                FROM "PROGRAMAS_ESTUDIO"
                WHERE "ACTIVO" = TRUE
                ORDER BY "ASIGNATURA", "GRADO", "ID"
                """, (rs, rowNum) -> new StudyProgramSummary(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("ASIGNATURA"),
                rs.getString("GRADO"),
                rs.getString("DECRETO"),
                rs.getString("FUENTE"),
                rs.getString("EDICION"),
                rs.getObject("TOTAL_UNIDADES", Integer.class),
                rs.getObject("TOTAL_OAS", Integer.class),
                rs.getObject("HORAS_TOTALES", Integer.class)
        ));
    }

    @Override
    public Optional<StudyProgramDetail> findProgramById(Long programId) {
        List<StudyProgramDetail> headers = jdbcTemplate.query("""
                SELECT
                    "ID",
                    "CODIGO",
                    "ASIGNATURA",
                    "GRADO",
                    "DECRETO",
                    "FUENTE",
                    "ISBN",
                    "EDICION",
                    "TOTAL_UNIDADES",
                    "TOTAL_OAS",
                    "HORAS_TOTALES",
                    "DESCRIPCION_OAS_PERMANENTES",
                    CAST("CONTENIDO_JSON" AS TEXT) AS raw_json
                FROM "PROGRAMAS_ESTUDIO"
                WHERE "ID" = ?
                  AND "ACTIVO" = TRUE
                """, (rs, rowNum) -> new StudyProgramDetail(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("ASIGNATURA"),
                rs.getString("GRADO"),
                rs.getString("DECRETO"),
                rs.getString("FUENTE"),
                rs.getString("ISBN"),
                rs.getString("EDICION"),
                rs.getObject("TOTAL_UNIDADES", Integer.class),
                rs.getObject("TOTAL_OAS", Integer.class),
                rs.getObject("HORAS_TOTALES", Integer.class),
                rs.getString("DESCRIPCION_OAS_PERMANENTES"),
                rs.getString("raw_json"),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of()
        ), programId);

        if (headers.isEmpty()) {
            return Optional.empty();
        }

        StudyProgramDetail header = headers.get(0);
        List<String> axes = findAxes(programId);
        List<StudyProgramDetail.Attitude> globalAttitudes = findGlobalAttitudes(programId);
        List<StudyProgramDetail.ObjectiveCatalogItem> objectiveCatalog = findObjectiveCatalog(programId);
        List<StudyProgramDetail.ObjectiveDetail> permanentObjectives = findPermanentObjectives(programId);
        List<StudyProgramDetail.Unit> units = findUnits(programId);

        return Optional.of(new StudyProgramDetail(
                header.id(),
                header.code(),
                header.subject(),
                header.grade(),
                header.decree(),
                header.source(),
                header.isbn(),
                header.edition(),
                header.totalUnits(),
                header.totalObjectives(),
                header.totalHours(),
                header.permanentObjectivesDescription(),
                header.rawJson(),
                axes,
                globalAttitudes,
                objectiveCatalog,
                permanentObjectives,
                units
        ));
    }

    private List<String> findAxes(Long programId) {
        return jdbcTemplate.query("""
                SELECT "NOMBRE"
                FROM "PROGRAMAS_ESTUDIO_EJES"
                WHERE "PROGRAMA_ID" = ?
                ORDER BY "ORDEN"
                """, (rs, rowNum) -> rs.getString("NOMBRE"), programId);
    }

    private List<StudyProgramDetail.Attitude> findGlobalAttitudes(Long programId) {
        return jdbcTemplate.query("""
                SELECT "CODIGO", "DESCRIPCION"
                FROM "PROGRAMAS_ESTUDIO_ACTITUDES"
                WHERE "PROGRAMA_ID" = ?
                  AND "UNIDAD_ID" IS NULL
                ORDER BY "ORDEN", "CODIGO"
                """, (rs, rowNum) -> new StudyProgramDetail.Attitude(
                rs.getString("CODIGO"),
                rs.getString("DESCRIPCION")
        ), programId);
    }

    private List<StudyProgramDetail.ObjectiveCatalogItem> findObjectiveCatalog(Long programId) {
        List<ObjectiveCatalogRow> rows = jdbcTemplate.query("""
                SELECT
                    o."ID",
                    o."CODIGO",
                    o."EJE",
                    o."DESCRIPCION"
                FROM "PROGRAMAS_ESTUDIO_OAS" o
                WHERE o."PROGRAMA_ID" = ?
                ORDER BY o."ORDEN", o."CODIGO"
                """, (rs, rowNum) -> new ObjectiveCatalogRow(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("EJE"),
                rs.getString("DESCRIPCION")
        ), programId);

        Map<Long, List<String>> subItems = loadSubItems("""
                SELECT "OA_ID", "DESCRIPCION"
                FROM "PROGRAMAS_ESTUDIO_OA_SUBITEMS"
                WHERE "OA_ID" IN (%s)
                ORDER BY "ORDEN", "ID"
                """, rows.stream().map(ObjectiveCatalogRow::id).toList());

        return rows.stream()
                .map(row -> new StudyProgramDetail.ObjectiveCatalogItem(
                        row.code(),
                        row.axis(),
                        row.description(),
                        subItems.getOrDefault(row.id(), List.of())
                ))
                .toList();
    }

    private List<StudyProgramDetail.ObjectiveDetail> findPermanentObjectives(Long programId) {
        List<ObjectiveDetailRow> rows = jdbcTemplate.query("""
                SELECT
                    p."ID",
                    o."CODIGO",
                    COALESCE(p."EJE", o."EJE") AS eje,
                    COALESCE(p."DESCRIPCION", o."DESCRIPCION") AS descripcion,
                    o."ID" AS oa_id
                FROM "PROGRAMAS_ESTUDIO_OAS_PERMANENTES" p
                JOIN "PROGRAMAS_ESTUDIO_OAS" o ON o."ID" = p."OA_ID"
                WHERE p."PROGRAMA_ID" = ?
                ORDER BY p."ORDEN", o."CODIGO"
                """, (rs, rowNum) -> new ObjectiveDetailRow(
                rs.getLong("ID"),
                rs.getLong("oa_id"),
                rs.getString("CODIGO"),
                rs.getString("eje"),
                rs.getString("descripcion")
        ), programId);

        Map<Long, List<String>> subItems = loadSubItems("""
                SELECT "OA_ID", "DESCRIPCION"
                FROM "PROGRAMAS_ESTUDIO_OA_SUBITEMS"
                WHERE "OA_ID" IN (%s)
                ORDER BY "ORDEN", "ID"
                """, rows.stream().map(ObjectiveDetailRow::baseObjectiveId).toList());
        Map<Long, List<String>> indicators = loadSubItems("""
                SELECT "OA_PERMANENTE_ID", "DESCRIPCION"
                FROM "PROGRAMAS_ESTUDIO_OA_PERMANENTE_INDICADORES"
                WHERE "OA_PERMANENTE_ID" IN (%s)
                ORDER BY "ORDEN", "ID"
                """, rows.stream().map(ObjectiveDetailRow::id).toList());
        Map<Long, List<StudyProgramDetail.Activity>> activities = loadActivities("""
                SELECT
                    "OA_PERMANENTE_ID" AS owner_id,
                    "NUMERO",
                    "TITULO",
                    "DESCRIPCION",
                    "OBSERVACION_DOCENTE",
                    "HABILIDADES",
                    "INTERDISCIPLINARIEDAD"
                FROM "PROGRAMAS_ESTUDIO_OA_PERMANENTE_ACTIVIDADES"
                WHERE "OA_PERMANENTE_ID" IN (%s)
                ORDER BY "ORDEN", "NUMERO", "ID"
                """, rows.stream().map(ObjectiveDetailRow::id).toList());

        return rows.stream()
                .map(row -> new StudyProgramDetail.ObjectiveDetail(
                        row.code(),
                        row.axis(),
                        row.description(),
                        subItems.getOrDefault(row.baseObjectiveId(), List.of()),
                        indicators.getOrDefault(row.id(), List.of()),
                        activities.getOrDefault(row.id(), List.of())
                ))
                .toList();
    }

    private List<StudyProgramDetail.Unit> findUnits(Long programId) {
        List<UnitRow> rows = jdbcTemplate.query("""
                SELECT
                    "ID",
                    "NUMERO",
                    "NOMBRE",
                    "SEMESTRE",
                    "HORAS_ESTIMADAS",
                    "PROPOSITO_GENERAL",
                    "CONOCIMIENTOS_PREVIOS",
                    "PALABRAS_CLAVE",
                    "CONOCIMIENTOS",
                    CAST("CONTENIDO_JSON" AS TEXT) AS "CONTENIDO_JSON",
                    "PROPOSITO_LECTURA",
                    "PROPOSITO_ESCRITURA",
                    "PROPOSITO_COMUNICACION_ORAL"
                FROM "PROGRAMAS_ESTUDIO_UNIDADES"
                WHERE "PROGRAMA_ID" = ?
                ORDER BY "NUMERO", "ID"
                """, (rs, rowNum) -> new UnitRow(
                rs.getLong("ID"),
                rs.getObject("NUMERO", Integer.class),
                rs.getString("NOMBRE"),
                rs.getObject("SEMESTRE", Integer.class),
                rs.getObject("HORAS_ESTIMADAS", Integer.class),
                rs.getString("PROPOSITO_GENERAL"),
                rs.getString("CONOCIMIENTOS_PREVIOS"),
                rs.getString("PALABRAS_CLAVE"),
                rs.getString("CONOCIMIENTOS"),
                rs.getString("CONTENIDO_JSON"),
                rs.getString("PROPOSITO_LECTURA"),
                rs.getString("PROPOSITO_ESCRITURA"),
                rs.getString("PROPOSITO_COMUNICACION_ORAL")
        ), programId);

        Map<Long, List<StudyProgramDetail.Attitude>> attitudes = loadUnitAttitudes(rows.stream().map(UnitRow::id).toList());
        Map<Long, List<StudyProgramDetail.Reading>> readings = loadReadings(rows.stream().map(UnitRow::id).toList());
        Map<Long, List<StudyProgramDetail.ObjectiveDetail>> objectives = loadUnitObjectives(rows.stream().map(UnitRow::id).toList());
        Map<Long, List<StudyProgramDetail.EvaluationExample>> evaluations = loadEvaluations(rows.stream().map(UnitRow::id).toList());

        return rows.stream()
                .map(row -> new StudyProgramDetail.Unit(
                        row.number(),
                        row.name(),
                        row.semester(),
                        row.estimatedHours(),
                        row.generalPurpose(),
                        row.priorKnowledge(),
                        row.keywords(),
                        row.knowledge(),
                        row.rawJson(),
                        row.readingPurpose(),
                        row.writingPurpose(),
                        row.oralPurpose(),
                        attitudes.getOrDefault(row.id(), List.of()),
                        readings.getOrDefault(row.id(), List.of()),
                        objectives.getOrDefault(row.id(), List.of()),
                        evaluations.getOrDefault(row.id(), List.of())
                ))
                .toList();
    }

    private Map<Long, List<StudyProgramDetail.Attitude>> loadUnitAttitudes(List<Long> unitIds) {
        if (unitIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<StudyProgramDetail.Attitude>> result = new LinkedHashMap<>();
        jdbcTemplate.query(buildInClause("""
                SELECT "UNIDAD_ID", "CODIGO", "DESCRIPCION"
                FROM "PROGRAMAS_ESTUDIO_ACTITUDES"
                WHERE "UNIDAD_ID" IN (%s)
                ORDER BY "UNIDAD_ID", "ORDEN", "CODIGO"
                """, unitIds), rs -> {
            result.computeIfAbsent(rs.getLong("UNIDAD_ID"), ignored -> new ArrayList<>())
                    .add(new StudyProgramDetail.Attitude(
                            rs.getString("CODIGO"),
                            rs.getString("DESCRIPCION")
                    ));
        }, unitIds.toArray());
        return result;
    }

    private Map<Long, List<StudyProgramDetail.Reading>> loadReadings(List<Long> unitIds) {
        if (unitIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<StudyProgramDetail.Reading>> result = new LinkedHashMap<>();
        jdbcTemplate.query(buildInClause("""
                SELECT "UNIDAD_ID", "CATEGORIA", "TITULO", "AUTOR"
                FROM "PROGRAMAS_ESTUDIO_LECTURAS"
                WHERE "UNIDAD_ID" IN (%s)
                ORDER BY "UNIDAD_ID", "CATEGORIA", "ORDEN", "ID"
                """, unitIds), rs -> {
            result.computeIfAbsent(rs.getLong("UNIDAD_ID"), ignored -> new ArrayList<>())
                    .add(new StudyProgramDetail.Reading(
                            rs.getString("CATEGORIA"),
                            rs.getString("TITULO"),
                            rs.getString("AUTOR")
                    ));
        }, unitIds.toArray());
        return result;
    }

    private Map<Long, List<StudyProgramDetail.ObjectiveDetail>> loadUnitObjectives(List<Long> unitIds) {
        if (unitIds.isEmpty()) {
            return Map.of();
        }

        List<UnitObjectiveRow> rows = jdbcTemplate.query(buildInClause("""
                SELECT
                    uo."ID",
                    uo."UNIDAD_ID",
                    uo."OA_ID",
                    uo."CODIGO",
                    uo."EJE",
                    uo."DESCRIPCION"
                FROM "PROGRAMAS_ESTUDIO_UNIDAD_OAS" uo
                WHERE uo."UNIDAD_ID" IN (%s)
                ORDER BY uo."UNIDAD_ID", uo."ORDEN", uo."CODIGO", uo."ID"
                """, unitIds), (rs, rowNum) -> new UnitObjectiveRow(
                rs.getLong("ID"),
                rs.getLong("UNIDAD_ID"),
                rs.getObject("OA_ID", Long.class),
                rs.getString("CODIGO"),
                rs.getString("EJE"),
                rs.getString("DESCRIPCION")
        ), unitIds.toArray());

        Map<Long, List<String>> unitSubItems = loadSubItems("""
                SELECT "UNIDAD_OA_ID", "DESCRIPCION"
                FROM "PROGRAMAS_ESTUDIO_UNIDAD_OA_SUBITEMS"
                WHERE "UNIDAD_OA_ID" IN (%s)
                ORDER BY "ORDEN", "ID"
                """, rows.stream().map(UnitObjectiveRow::id).toList());
        Map<Long, List<String>> catalogSubItems = loadSubItems("""
                SELECT "OA_ID", "DESCRIPCION"
                FROM "PROGRAMAS_ESTUDIO_OA_SUBITEMS"
                WHERE "OA_ID" IN (%s)
                ORDER BY "ORDEN", "ID"
                """, rows.stream()
                .map(UnitObjectiveRow::baseObjectiveId)
                .filter(java.util.Objects::nonNull)
                .toList());
        Map<Long, List<String>> indicators = loadSubItems("""
                SELECT "UNIDAD_OA_ID", "DESCRIPCION"
                FROM "PROGRAMAS_ESTUDIO_UNIDAD_OA_INDICADORES"
                WHERE "UNIDAD_OA_ID" IN (%s)
                ORDER BY "ORDEN", "ID"
                """, rows.stream().map(UnitObjectiveRow::id).toList());
        Map<Long, List<StudyProgramDetail.Activity>> activities = loadActivities("""
                SELECT
                    "UNIDAD_OA_ID" AS owner_id,
                    "NUMERO",
                    "TITULO",
                    "DESCRIPCION",
                    "OBSERVACION_DOCENTE",
                    "HABILIDADES",
                    "INTERDISCIPLINARIEDAD"
                FROM "PROGRAMAS_ESTUDIO_UNIDAD_OA_ACTIVIDADES"
                WHERE "UNIDAD_OA_ID" IN (%s)
                ORDER BY "ORDEN", "NUMERO", "ID"
                """, rows.stream().map(UnitObjectiveRow::id).toList());

        Map<Long, List<StudyProgramDetail.ObjectiveDetail>> result = new LinkedHashMap<>();
        for (UnitObjectiveRow row : rows) {
            List<String> subItems = unitSubItems.getOrDefault(row.id(), List.of());
            if (subItems.isEmpty() && row.baseObjectiveId() != null) {
                subItems = catalogSubItems.getOrDefault(row.baseObjectiveId(), List.of());
            }

            result.computeIfAbsent(row.unitId(), ignored -> new ArrayList<>())
                    .add(new StudyProgramDetail.ObjectiveDetail(
                            row.code(),
                            row.axis(),
                            row.description(),
                            subItems,
                            indicators.getOrDefault(row.id(), List.of()),
                            activities.getOrDefault(row.id(), List.of())
                    ));
        }
        return result;
    }

    private Map<Long, List<StudyProgramDetail.EvaluationExample>> loadEvaluations(List<Long> unitIds) {
        if (unitIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<StudyProgramDetail.EvaluationExample>> result = new LinkedHashMap<>();
        jdbcTemplate.query(buildInClause("""
                SELECT
                    "UNIDAD_ID",
                    "NUMERO",
                    "OA_CODIGO",
                    "INDICADORES_EVALUADOS",
                    "DESCRIPCION_ACTIVIDAD",
                    "CRITERIOS_EVALUACION"
                FROM "PROGRAMAS_ESTUDIO_UNIDAD_EVALUACIONES"
                WHERE "UNIDAD_ID" IN (%s)
                ORDER BY "UNIDAD_ID", "ORDEN", "NUMERO", "ID"
                """, unitIds), rs -> {
            result.computeIfAbsent(rs.getLong("UNIDAD_ID"), ignored -> new ArrayList<>())
                    .add(new StudyProgramDetail.EvaluationExample(
                            rs.getObject("NUMERO", Integer.class),
                            rs.getString("OA_CODIGO"),
                            rs.getString("INDICADORES_EVALUADOS"),
                            rs.getString("DESCRIPCION_ACTIVIDAD"),
                            rs.getString("CRITERIOS_EVALUACION")
                    ));
        }, unitIds.toArray());
        return result;
    }

    private Map<Long, List<String>> loadSubItems(String sqlTemplate, List<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<String>> result = new LinkedHashMap<>();
        jdbcTemplate.query(buildInClause(sqlTemplate, ids), rs -> {
            result.computeIfAbsent(rs.getLong(1), ignored -> new ArrayList<>())
                    .add(rs.getString(2));
        }, ids.toArray());
        return result;
    }

    private Map<Long, List<StudyProgramDetail.Activity>> loadActivities(String sqlTemplate, List<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<StudyProgramDetail.Activity>> result = new LinkedHashMap<>();
        jdbcTemplate.query(buildInClause(sqlTemplate, ids), rs -> {
            result.computeIfAbsent(rs.getLong("owner_id"), ignored -> new ArrayList<>())
                    .add(new StudyProgramDetail.Activity(
                            rs.getObject("NUMERO", Integer.class),
                            rs.getString("TITULO"),
                            rs.getString("DESCRIPCION"),
                            rs.getString("OBSERVACION_DOCENTE"),
                            rs.getString("HABILIDADES"),
                            rs.getString("INTERDISCIPLINARIEDAD")
                    ));
        }, ids.toArray());
        return result;
    }

    private String buildInClause(String sqlTemplate, List<Long> ids) {
        String placeholders = String.join(", ", java.util.Collections.nCopies(ids.size(), "?"));
        return sqlTemplate.formatted(placeholders);
    }

    private record ObjectiveCatalogRow(
            Long id,
            String code,
            String axis,
            String description
    ) {
    }

    private record ObjectiveDetailRow(
            Long id,
            Long baseObjectiveId,
            String code,
            String axis,
            String description
    ) {
    }

    private record UnitRow(
            Long id,
            Integer number,
            String name,
            Integer semester,
            Integer estimatedHours,
            String generalPurpose,
            String priorKnowledge,
            String keywords,
            String knowledge,
            String rawJson,
            String readingPurpose,
            String writingPurpose,
            String oralPurpose
    ) {
    }

    private record UnitObjectiveRow(
            Long id,
            Long unitId,
            Long baseObjectiveId,
            String code,
            String axis,
            String description
    ) {
    }
}
