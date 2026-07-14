package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StreamUtils;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class InitialEducationProgramInitializer implements CommandLineRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(InitialEducationProgramInitializer.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final List<VisibleSubjectMapping> SUBJECT_MAPPINGS = List.of(
            new VisibleSubjectMapping("Lecto escritura", "Comunicacion Integral", "Lenguaje Verbal"),
            new VisibleSubjectMapping("Lectura compartida", "Comunicacion Integral", "Lenguaje Verbal"),
            new VisibleSubjectMapping("Artes", "Comunicacion Integral", "Lenguajes Artisticos"),
            new VisibleSubjectMapping("Musica", "Comunicacion Integral", "Lenguajes Artisticos"),
            new VisibleSubjectMapping("Matematica", "Interaccion y Comprension del Entorno", "Pensamiento Matematico"),
            new VisibleSubjectMapping("Ciencias naturales", "Interaccion y Comprension del Entorno", "Exploracion del Entorno Natural"),
            new VisibleSubjectMapping("Social", "Interaccion y Comprension del Entorno", "Comprension del Entorno Sociocultural"),
            new VisibleSubjectMapping("Educacion Fisica", "Desarrollo Personal y Social", "Corporalidad y Movimiento"),
            new VisibleSubjectMapping("Social", "Desarrollo Personal y Social", "Identidad y Autonomia"),
            new VisibleSubjectMapping("Social", "Desarrollo Personal y Social", "Convivencia y Ciudadania")
    );

    public InitialEducationProgramInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        ensureSchema();

        if (hasExistingPrograms()) {
            LOGGER.info("Programas de educacion inicial ya presentes en BD, se omite siembra automatica");
            return;
        }

        seedFromResources("data/study-programs/programa_pedagogico_NT1_NT2_final.json");
    }

    private boolean hasExistingPrograms() {
        Integer total = jdbcTemplate.queryForObject("""
                SELECT COUNT(1)
                FROM "PROGRAMAS_EDUCACION_INICIAL"
                WHERE "ACTIVO" = TRUE
                """, Integer.class);
        return total != null && total > 0;
    }

    private void ensureSchema() throws Exception {
        if (Boolean.TRUE.equals(jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = current_schema()
                      AND table_name = 'PROGRAMAS_EDUCACION_INICIAL'
                )
                """, Boolean.class))) {
            return;
        }

        ClassPathResource migration = new ClassPathResource("db/migration/V26__initial_education_programs.sql");
        String sql = StreamUtils.copyToString(migration.getInputStream(), StandardCharsets.UTF_8);
        jdbcTemplate.execute(sql);
    }

    private void seedFromResources(String classpathLocation) throws Exception {
        JsonResource source = loadJsonResource(classpathLocation);
        if (source == null) {
            return;
        }

        JsonNode root = source.root();
        for (String grade : List.of("NT1", "NT2")) {
            for (JsonNode ambitNode : iterable(root.path("ambitos"))) {
                String ambit = ambitNode.path("nombre").asText("");
                for (JsonNode nucleusNode : iterable(ambitNode.path("nucleos"))) {
                    String nucleus = nucleusNode.path("nombre").asText("");
                    List<VisibleSubjectMapping> mappings = SUBJECT_MAPPINGS.stream()
                            .filter(mapping ->
                                    normalize(mapping.ambit()).equals(normalize(ambit))
                                            && normalize(mapping.nucleus()).equals(normalize(nucleus)))
                            .toList();
                    if (mappings.isEmpty()) {
                        continue;
                    }

                    for (VisibleSubjectMapping mapping : mappings) {
                        seedProgramVariant(
                                root,
                                source.rawJson(),
                                grade,
                                mapping.visibleSubject(),
                                ambit,
                                nucleus,
                                nucleusNode.path("objetivos_aprendizaje")
                        );
                    }
                }
            }
        }

        LOGGER.info("Programas de educacion inicial NT1/NT2 verificados para planificaciones");
    }

    private JsonResource loadJsonResource(String classpathLocation) throws Exception {
        ClassPathResource resource = new ClassPathResource(classpathLocation);
        if (!resource.exists()) {
            LOGGER.warn("No se encontro recurso de educacion inicial en {}", classpathLocation);
            return null;
        }

        String rawJson;
        try (InputStream inputStream = resource.getInputStream()) {
            rawJson = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }

        return new JsonResource(rawJson, objectMapper.readTree(rawJson));
    }

    private void seedProgramVariant(
            JsonNode root,
            String rawJson,
            String grade,
            String visibleSubject,
            String ambit,
            String nucleus,
            JsonNode objectivesNode
    ) throws Exception {
        List<JsonNode> objectives = iterable(objectivesNode);
        String code = "educacion-inicial-%s-%s-%s-%s".formatted(
                normalizeSlug(grade),
                normalizeSlug(visibleSubject),
                normalizeSlug(ambit),
                normalizeSlug(nucleus)
        );

        Map<String, Object> scopeJson = new LinkedHashMap<>();
        scopeJson.put("fuente", textOrNull(root.path("fuente")));
        scopeJson.put("editorial", textOrNull(root.path("editorial")));
        scopeJson.put("year", textOrNull(root.path("year")));
        scopeJson.put("grade", grade);
        scopeJson.put("visible_subject", visibleSubject);
        scopeJson.put("ambit", ambit);
        scopeJson.put("nucleus", nucleus);
        scopeJson.put("total_oas", objectives.size());

        Long programId = upsertProgram(
                code,
                grade,
                visibleSubject,
                ambit,
                nucleus,
                objectMapper.writeValueAsString(scopeJson),
                objectives.size()
        );

        clearChildren(programId);
        int objectiveOrder = 1;
        for (JsonNode objectiveNode : objectives) {
            String objectiveCode = "OA" + objectiveNode.path("numero").asText("");
            Long objectiveId = jdbcTemplate.queryForObject("""
                    INSERT INTO "PROGRAMAS_EDUCACION_INICIAL_OAS" (
                        "PROGRAMA_ID",
                        "ORDEN",
                        "CODIGO",
                        "DESCRIPCION"
                    )
                    VALUES (?, ?, ?, ?)
                    RETURNING "ID"
                    """, Long.class,
                    programId,
                    objectiveOrder++,
                    objectiveCode,
                    textOrNull(objectiveNode.path("descripcion"))
            );

            int indicatorOrder = 1;
            List<String> indicators = extractTextArray(objectiveNode.path("indicadores").path(grade));
            for (String indicator : indicators) {
                jdbcTemplate.update("""
                        INSERT INTO "PROGRAMAS_EDUCACION_INICIAL_OA_INDICADORES" (
                            "OA_ID",
                            "ORDEN",
                            "DESCRIPCION"
                        )
                        VALUES (?, ?, ?)
                        """,
                        objectiveId,
                        indicatorOrder++,
                        indicator
                );
            }

            int activityOrder = 1;
            List<ActivitySeed> activities = extractActivitySeeds(objectiveNode.path("actividades").path(grade));
            for (ActivitySeed activity : activities) {
                jdbcTemplate.update("""
                        INSERT INTO "PROGRAMAS_EDUCACION_INICIAL_OA_ACTIVIDADES" (
                            "OA_ID",
                            "ORDEN",
                            "NUMERO",
                            "DESCRIPCION"
                        )
                        VALUES (?, ?, ?, ?)
                        """,
                        objectiveId,
                        activityOrder,
                        activity.number() != null ? activity.number() : activityOrder,
                        activity.description()
                );
                activityOrder++;
            }
        }
    }

    private List<String> extractTextArray(JsonNode node) {
        List<String> values = new ArrayList<>();
        for (JsonNode item : iterable(node)) {
            String value = textOrNull(item);
            if (value != null) {
                values.add(value);
            }
        }
        return values;
    }

    private List<ActivitySeed> extractActivitySeeds(JsonNode node) {
        List<ActivitySeed> values = new ArrayList<>();
        for (JsonNode item : iterable(node)) {
            if (item == null || item.isMissingNode() || item.isNull()) {
                continue;
            }

            if (item.isObject()) {
                String description = textOrNull(item.path("descripcion"));
                if (description != null) {
                    Integer number = item.path("numero").isNumber() ? item.path("numero").asInt() : null;
                    values.add(new ActivitySeed(number, description));
                }
                continue;
            }

            String description = textOrNull(item);
            if (description != null) {
                values.add(new ActivitySeed(null, description));
            }
        }
        return values;
    }

    private Long upsertProgram(
            String code,
            String grade,
            String visibleSubject,
            String ambit,
            String nucleus,
            String rawJson,
            Integer totalObjectives
    ) {
        Long existingId = jdbcTemplate.query("""
                SELECT "ID"
                FROM "PROGRAMAS_EDUCACION_INICIAL"
                WHERE "CODIGO" = ?
                """, (rs, rowNum) -> rs.getLong("ID"), code).stream().findFirst().orElse(null);

        if (existingId == null) {
            return jdbcTemplate.queryForObject("""
                    INSERT INTO "PROGRAMAS_EDUCACION_INICIAL" (
                        "CODIGO",
                        "GRADO",
                        "ASIGNATURA_VISIBLE",
                        "ASIGNATURA_VISIBLE_NORMALIZADA",
                        "AMBITO",
                        "AMBITO_NORMALIZADO",
                        "NUCLEO",
                        "NUCLEO_NORMALIZADO",
                        "TOTAL_OAS",
                        "CONTENIDO_JSON",
                        "ACTIVO"
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), TRUE)
                    RETURNING "ID"
                    """, Long.class,
                    code,
                    grade,
                    visibleSubject,
                    normalize(visibleSubject),
                    ambit,
                    normalize(ambit),
                    nucleus,
                    normalize(nucleus),
                    totalObjectives,
                    rawJson
            );
        }

        jdbcTemplate.update("""
                UPDATE "PROGRAMAS_EDUCACION_INICIAL"
                SET "GRADO" = ?,
                    "ASIGNATURA_VISIBLE" = ?,
                    "ASIGNATURA_VISIBLE_NORMALIZADA" = ?,
                    "AMBITO" = ?,
                    "AMBITO_NORMALIZADO" = ?,
                    "NUCLEO" = ?,
                    "NUCLEO_NORMALIZADO" = ?,
                    "TOTAL_OAS" = ?,
                    "CONTENIDO_JSON" = CAST(? AS jsonb),
                    "ACTIVO" = TRUE,
                    "FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP
                WHERE "ID" = ?
                """,
                grade,
                visibleSubject,
                normalize(visibleSubject),
                ambit,
                normalize(ambit),
                nucleus,
                normalize(nucleus),
                totalObjectives,
                rawJson,
                existingId
        );
        return existingId;
    }

    private void clearChildren(Long programId) {
        jdbcTemplate.update("""
                DELETE FROM "PROGRAMAS_EDUCACION_INICIAL_OA_ACTIVIDADES"
                WHERE "OA_ID" IN (
                    SELECT "ID" FROM "PROGRAMAS_EDUCACION_INICIAL_OAS" WHERE "PROGRAMA_ID" = ?
                )
                """, programId);
        jdbcTemplate.update("""
                DELETE FROM "PROGRAMAS_EDUCACION_INICIAL_OA_INDICADORES"
                WHERE "OA_ID" IN (
                    SELECT "ID" FROM "PROGRAMAS_EDUCACION_INICIAL_OAS" WHERE "PROGRAMA_ID" = ?
                )
                """, programId);
        jdbcTemplate.update("""
                DELETE FROM "PROGRAMAS_EDUCACION_INICIAL_OAS"
                WHERE "PROGRAMA_ID" = ?
                """, programId);
    }

    private List<JsonNode> iterable(JsonNode node) {
        List<JsonNode> values = new ArrayList<>();
        if (node == null || node.isMissingNode() || node.isNull() || !node.isArray()) {
            return values;
        }
        node.forEach(values::add);
        return values;
    }

    private String textOrNull(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        String value = node.asText(null);
        return value == null || value.isBlank() ? null : value.trim();
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

    private String normalizeSlug(String value) {
        return normalize(value).replace(' ', '-');
    }

    private record VisibleSubjectMapping(
            String visibleSubject,
            String ambit,
            String nucleus
    ) {
    }

    private record JsonResource(
            String rawJson,
            JsonNode root
    ) {
    }

    private record ActivitySeed(
            Integer number,
            String description
    ) {
    }
}
