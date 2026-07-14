package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.InitialEducationProgramDetail;
import com.example.authhexagonal.domain.port.out.InitialEducationProgramRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class InitialEducationProgramJdbcAdapter implements InitialEducationProgramRepository {

    private final JdbcTemplate jdbcTemplate;

    public InitialEducationProgramJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<InitialEducationProgramDetail> findProgram(String grade, String visibleSubject, String ambit, String nucleus) {
        List<InitialEducationProgramDetail> headers = jdbcTemplate.query("""
                SELECT
                    "ID",
                    "CODIGO",
                    "GRADO",
                    "ASIGNATURA_VISIBLE",
                    "AMBITO",
                    "NUCLEO",
                    "TOTAL_OAS",
                    CAST("CONTENIDO_JSON" AS TEXT) AS raw_json
                FROM "PROGRAMAS_EDUCACION_INICIAL"
                WHERE "ACTIVO" = TRUE
                  AND "GRADO" = ?
                  AND "ASIGNATURA_VISIBLE_NORMALIZADA" = ?
                  AND "AMBITO_NORMALIZADO" = ?
                  AND "NUCLEO_NORMALIZADO" = ?
                """, (rs, rowNum) -> new InitialEducationProgramDetail(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("GRADO"),
                rs.getString("ASIGNATURA_VISIBLE"),
                rs.getString("AMBITO"),
                rs.getString("NUCLEO"),
                rs.getObject("TOTAL_OAS", Integer.class),
                rs.getString("raw_json"),
                List.of()
        ), grade, normalize(visibleSubject), normalize(ambit), normalize(nucleus));

        if (headers.isEmpty()) {
            return Optional.empty();
        }

        InitialEducationProgramDetail header = headers.get(0);
        return Optional.of(new InitialEducationProgramDetail(
                header.id(),
                header.code(),
                header.grade(),
                header.visibleSubject(),
                header.ambit(),
                header.nucleus(),
                header.totalObjectives(),
                header.rawJson(),
                findObjectives(header.id())
        ));
    }

    private List<InitialEducationProgramDetail.Objective> findObjectives(Long programId) {
        List<ObjectiveRow> rows = jdbcTemplate.query("""
                SELECT
                    "ID",
                    "CODIGO",
                    "DESCRIPCION"
                FROM "PROGRAMAS_EDUCACION_INICIAL_OAS"
                WHERE "PROGRAMA_ID" = ?
                ORDER BY "ORDEN", "CODIGO"
                """, (rs, rowNum) -> new ObjectiveRow(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("DESCRIPCION")
        ), programId);

        Map<Long, List<String>> indicators = loadSubItems("""
                SELECT "OA_ID", "DESCRIPCION"
                FROM "PROGRAMAS_EDUCACION_INICIAL_OA_INDICADORES"
                WHERE "OA_ID" IN (%s)
                ORDER BY "ORDEN", "ID"
                """, rows.stream().map(ObjectiveRow::id).toList());
        Map<Long, List<InitialEducationProgramDetail.Activity>> activities = loadActivities("""
                SELECT "OA_ID", "NUMERO", "DESCRIPCION"
                FROM "PROGRAMAS_EDUCACION_INICIAL_OA_ACTIVIDADES"
                WHERE "OA_ID" IN (%s)
                ORDER BY "ORDEN", "ID"
                """, rows.stream().map(ObjectiveRow::id).toList());

        return rows.stream()
                .map(row -> new InitialEducationProgramDetail.Objective(
                        row.code(),
                        row.description(),
                        indicators.getOrDefault(row.id(), List.of()),
                        activities.getOrDefault(row.id(), List.of())
                ))
                .toList();
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

    private Map<Long, List<InitialEducationProgramDetail.Activity>> loadActivities(String sqlTemplate, List<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<InitialEducationProgramDetail.Activity>> result = new LinkedHashMap<>();
        jdbcTemplate.query(buildInClause(sqlTemplate, ids), rs -> {
            result.computeIfAbsent(rs.getLong("OA_ID"), ignored -> new ArrayList<>())
                    .add(new InitialEducationProgramDetail.Activity(
                            rs.getObject("NUMERO", Integer.class),
                            rs.getString("DESCRIPCION")
                    ));
        }, ids.toArray());
        return result;
    }

    private String buildInClause(String sqlTemplate, List<Long> ids) {
        String placeholders = String.join(", ", java.util.Collections.nCopies(ids.size(), "?"));
        return sqlTemplate.formatted(placeholders);
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('º', 'o')
                .replace('°', 'o')
                .toLowerCase(Locale.ROOT)
                .trim();
        return normalized.replaceAll("[^a-z0-9]+", " ").trim();
    }

    private record ObjectiveRow(
            Long id,
            String code,
            String description
    ) {
    }
}
