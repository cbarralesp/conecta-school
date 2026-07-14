package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "app.planning.demo.enabled", havingValue = "true")
public class PlanningDemoContentInitializer implements CommandLineRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(PlanningDemoContentInitializer.class);

    private final JdbcTemplate jdbcTemplate;
    private final Path demoDirectory;

    public PlanningDemoContentInitializer(
            JdbcTemplate jdbcTemplate,
            @Value("${app.uploads.root:uploads}") String uploadsRoot
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.demoDirectory = Paths.get(uploadsRoot).toAbsolutePath().normalize().resolve("planning-classes");
    }

    @Override
    public void run(String... args) {
        Optional<SeedContext> seedContext = findSeedContext();
        if (seedContext.isEmpty()) {
            LOGGER.warn("No se encontro una carga docente activa para precargar demo de contenido");
            return;
        }

        try {
            Files.createDirectories(demoDirectory);
        } catch (IOException exception) {
            throw new IllegalStateException("No fue posible preparar el directorio de documentos demo", exception);
        }

        SeedContext context = seedContext.orElseThrow();

        Long unitOneId = upsertUnit(
                context,
                "UNIDAD_I",
                "El sistema solar y los movimientos de la Tierra",
                LocalDate.of(2026, 3, 10),
                LocalDate.of(2026, 3, 24),
                2,
                3,
                "Unidad demo para vista precargada de contenido",
                "Comprender los elementos principales del sistema solar y los movimientos de la Tierra",
                "Explica movimientos, estaciones y ubicacion de los planetas",
                "ACTIVA"
        );

        Long unitTwoId = upsertUnit(
                context,
                "UNIDAD_II",
                "Tecnicas de dibujo y pintura",
                LocalDate.of(2026, 3, 25),
                LocalDate.of(2026, 4, 14),
                3,
                2,
                "Unidad demo con tecnicas visuales y materiales de arte",
                "Reconocer materiales y aplicar tecnicas basicas de dibujo y pintura",
                "Usa materiales y tecnicas en ejercicios guiados",
                "ACTIVA"
        );

        Long classOneId = upsertClass(
                context.userId(),
                unitOneId,
                "Clase 1: Introduccion al sistema solar",
                LocalDate.of(2026, 3, 10),
                "90_MIN",
                "90 minutos",
                "OA-SS-01",
                "Identificar planetas y componentes del sistema solar",
                "Observacion guiada y analisis de planetas interiores y exteriores",
                "FORMATIVA",
                "Pregunta de activacion sobre el universo",
                "Presentacion del sistema solar y trabajo con guia",
                "Sintesis colectiva de aprendizajes",
                "PUBLICADA",
                true
        );

        Long classTwoId = upsertClass(
                context.userId(),
                unitOneId,
                "Clase 2: Movimientos de la Tierra",
                LocalDate.of(2026, 3, 14),
                "90_MIN",
                "90 minutos",
                "OA-SS-02",
                "Relacionar rotacion y traslacion con fenomenos cotidianos",
                "Explicacion de rotacion, traslacion y estaciones",
                "FORMATIVA",
                "Recuperacion de conocimientos previos",
                "Modelado con esquemas y preguntas guiadas",
                "Conclusiones sobre estaciones del ano",
                "BORRADOR",
                false
        );

        Long classThreeId = upsertClass(
                context.userId(),
                unitOneId,
                "Clase 3: Las estaciones y sus efectos",
                LocalDate.of(2026, 3, 18),
                "90_MIN",
                "90 minutos",
                "OA-SS-03",
                "Describir como cambian las estaciones",
                "Analisis de clima y luz solar durante el ano",
                "SUMATIVA",
                "Observacion de imagenes del clima",
                "Trabajo en parejas con esquema de estaciones",
                "Puesta en comun y ticket de salida",
                "PUBLICADA",
                true
        );

        Long classFourId = upsertClass(
                context.userId(),
                unitTwoId,
                "Clase 1: Materiales y herramientas basicas",
                LocalDate.of(2026, 3, 26),
                "90_MIN",
                "90 minutos",
                "OA-AR-01",
                "Reconocer materiales de dibujo y pintura",
                "Exploracion de materiales artisticos y usos principales",
                "FORMATIVA",
                "Conversacion inicial sobre materiales conocidos",
                "Exploracion de herramientas y registro visual",
                "Cierre con comparacion de materiales",
                "PUBLICADA",
                true
        );

        Long classFiveId = upsertClass(
                context.userId(),
                unitTwoId,
                "Clase 2: Tecnicas mixtas y composicion",
                LocalDate.of(2026, 4, 2),
                "90_MIN",
                "90 minutos",
                "OA-AR-02",
                "Aplicar tecnicas mixtas en una composicion simple",
                "Planificacion y ejecucion de una composicion guiada",
                "FORMATIVA",
                "Revision de referentes visuales",
                "Trabajo practico con tecnica mixta",
                "Autoevaluacion breve del proceso",
                "BORRADOR",
                false
        );

        upsertDocument(
                context.userId(),
                unitOneId,
                classOneId,
                "Guia del sistema solar - Introduccion.pdf",
                "guia-sistema-solar-introduccion-demo.pdf",
                "pdf",
                "application/pdf",
                createDemoFile(
                        "guia-sistema-solar-introduccion-demo.pdf",
                        """
                        Demo PDF
                        Guia del sistema solar - Introduccion
                        Contenido de prueba para precarga del modulo Contenido.
                        """
                ),
                true
        );

        upsertDocument(
                context.userId(),
                unitOneId,
                classOneId,
                "Presentacion - Planetas del sistema solar.pptx",
                "presentacion-planetas-sistema-solar-demo.pptx",
                "pptx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                createDemoFile(
                        "presentacion-planetas-sistema-solar-demo.pptx",
                        """
                        Demo PPTX
                        Presentacion - Planetas del sistema solar
                        Archivo de apoyo para vista precargada.
                        """
                ),
                true
        );

        upsertDocument(
                context.userId(),
                unitOneId,
                classTwoId,
                "Actividad - Rotacion y traslacion.docx",
                "actividad-rotacion-traslacion-demo.docx",
                "docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                createDemoFile(
                        "actividad-rotacion-traslacion-demo.docx",
                        """
                        Demo DOCX
                        Actividad - Rotacion y traslacion
                        Material de apoyo para docente.
                        """
                ),
                false
        );

        upsertDocument(
                context.userId(),
                unitOneId,
                classThreeId,
                "Infografia - Estaciones del ano.pdf",
                "infografia-estaciones-ano-demo.pdf",
                "pdf",
                "application/pdf",
                createDemoFile(
                        "infografia-estaciones-ano-demo.pdf",
                        """
                        Demo PDF
                        Infografia - Estaciones del ano
                        Material de cierre para la unidad.
                        """
                ),
                true
        );

        upsertDocument(
                context.userId(),
                unitTwoId,
                classFourId,
                "Catalogo de materiales artisticos.pdf",
                "catalogo-materiales-artisticos-demo.pdf",
                "pdf",
                "application/pdf",
                createDemoFile(
                        "catalogo-materiales-artisticos-demo.pdf",
                        """
                        Demo PDF
                        Catalogo de materiales artisticos
                        Muestra de materiales para ejercicios de arte.
                        """
                ),
                true
        );

        upsertDocument(
                context.userId(),
                unitTwoId,
                classFourId,
                "Ejemplos de tecnicas mixtas.jpg",
                "ejemplos-tecnicas-mixtas-demo.jpg",
                "jpg",
                "image/jpeg",
                createDemoFile(
                        "ejemplos-tecnicas-mixtas-demo.jpg",
                        """
                        Demo IMG
                        Ejemplos de tecnicas mixtas
                        Recurso visual de referencia.
                        """
                ),
                false
        );

        upsertDocument(
                context.userId(),
                unitTwoId,
                classFiveId,
                "Guia de composicion creativa.docx",
                "guia-composicion-creativa-demo.docx",
                "docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                createDemoFile(
                        "guia-composicion-creativa-demo.docx",
                        """
                        Demo DOCX
                        Guia de composicion creativa
                        Instrucciones para actividad de composicion.
                        """
                ),
                false
        );

        LOGGER.info("Seed demo de contenido academico verificado para carga docente {}", context.loadId());
    }

    private Optional<SeedContext> findSeedContext() {
        return jdbcTemplate.query("""
                SELECT
                    cd."ID" AS load_id,
                    u."ID" AS user_id
                FROM "CARGAS_DOCENTES" cd
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID" AND c."ACTIVO" = TRUE
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID" AND a."ACTIVA" = TRUE
                JOIN "PROFESORES" p ON p."ID" = cd."PROFESOR_ID"
                JOIN "USUARIOS" u ON u."PERSONA_ID" = p."PERSONA_ID"
                WHERE cd."ACTIVA" = TRUE
                ORDER BY cd."ANIO_ESCOLAR" DESC, cd."ID"
                """, (rs, rowNum) -> new SeedContext(
                rs.getLong("load_id"),
                rs.getLong("user_id")
        )).stream().findFirst();
    }

    private Long upsertUnit(
            SeedContext context,
            String unitNumber,
            String name,
            LocalDate startDate,
            LocalDate endDate,
            int estimatedWeeks,
            int plannedClasses,
            String generalDescription,
            String learningObjectives,
            String achievementIndicators,
            String status
    ) {
        Optional<Long> existingId = jdbcTemplate.query("""
                SELECT "ID"
                FROM "UNIDADES_PLANIFICACION"
                WHERE "CARGA_DOCENTE_ID" = ?
                  AND UPPER("NOMBRE") = UPPER(?)
                """, (rs, rowNum) -> rs.getLong("ID"), context.loadId(), name).stream().findFirst();

        if (existingId.isPresent()) {
            return existingId.orElseThrow();
        }

        syncSequence("UNIDADES_PLANIFICACION", "ID");

        return jdbcTemplate.queryForObject("""
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
                VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING "ID"
                """, Long.class,
                context.loadId(),
                unitNumber,
                name,
                startDate,
                endDate,
                estimatedWeeks,
                plannedClasses,
                generalDescription,
                learningObjectives,
                achievementIndicators,
                status,
                context.userId()
        );
    }

    private Long upsertClass(
            Long userId,
            Long unitId,
            String title,
            LocalDate plannedDate,
            String durationCode,
            String durationLabel,
            String objectiveCode,
            String objectiveTitle,
            String objectiveDescription,
            String evaluationType,
            String startActivity,
            String developmentActivity,
            String closingActivity,
            String status,
            boolean publishedToStudents
    ) {
        Optional<Long> existingId = jdbcTemplate.query("""
                SELECT "ID"
                FROM "CLASES_PLANIFICACION"
                WHERE "UNIDAD_ID" = ?
                  AND UPPER("TITULO") = UPPER(?)
                """, (rs, rowNum) -> rs.getLong("ID"), unitId, title).stream().findFirst();

        if (existingId.isPresent()) {
            return existingId.orElseThrow();
        }

        syncSequence("CLASES_PLANIFICACION", "ID");

        return jdbcTemplate.queryForObject("""
                INSERT INTO "CLASES_PLANIFICACION" (
                    "UNIDAD_ID",
                    "TITULO",
                    "FECHA_PLANIFICADA",
                    "DURACION_CODIGO",
                    "DURACION_LABEL",
                    "OA_CODIGO",
                    "OA_TITULO",
                    "OA_DESCRIPCION",
                    "TIPO_EVALUACION",
                    "INICIO_ACTIVIDAD",
                    "DESARROLLO_ACTIVIDAD",
                    "CIERRE_ACTIVIDAD",
                    "ESTADO",
                    "PUBLICADO_A_ALUMNOS",
                    "CREADO_POR_USUARIO_ID"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING "ID"
                """, Long.class,
                unitId,
                title,
                plannedDate,
                durationCode,
                durationLabel,
                objectiveCode,
                objectiveTitle,
                objectiveDescription,
                evaluationType,
                startActivity,
                developmentActivity,
                closingActivity,
                status,
                publishedToStudents,
                userId
        );
    }

    private void upsertDocument(
            Long userId,
            Long unitId,
            Long classId,
            String originalName,
            String storedName,
            String extension,
            String mimeType,
            Path filePath,
            boolean visibleToStudents
    ) {
        Integer existing = jdbcTemplate.query("""
                SELECT 1
                FROM "CLASES_PLANIFICACION_DOCUMENTOS"
                WHERE "CLASE_ID" = ?
                  AND UPPER("NOMBRE_ORIGINAL") = UPPER(?)
                  AND COALESCE("ELIMINADO", FALSE) = FALSE
                """, (rs, rowNum) -> rs.getInt(1), classId, originalName).stream().findFirst().orElse(null);

        if (existing != null) {
            return;
        }

        syncSequence("CLASES_PLANIFICACION_DOCUMENTOS", "ID");

        long sizeBytes;
        try {
            sizeBytes = Files.size(filePath);
        } catch (IOException exception) {
            throw new IllegalStateException("No fue posible leer el tamano del documento demo", exception);
        }

        jdbcTemplate.update("""
                INSERT INTO "CLASES_PLANIFICACION_DOCUMENTOS" (
                    "CLASE_ID",
                    "UNIDAD_ID",
                    "NOMBRE_ORIGINAL",
                    "NOMBRE_ARCHIVO",
                    "EXTENSION",
                    "MIME_TYPE",
                    "PESO_BYTES",
                    "RUTA_ARCHIVO",
                    "TIPO_ARCHIVO",
                    "VISIBLE_ALUMNOS",
                    "ESTADO",
                    "ELIMINADO",
                    "CREADO_POR_USUARIO_ID"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', FALSE, ?)
                """,
                classId,
                unitId,
                originalName,
                storedName,
                extension,
                mimeType,
                sizeBytes,
                filePath.toString(),
                resolveFileType(extension),
                visibleToStudents,
                userId
        );
    }

    private Path createDemoFile(String fileName, String content) {
        Path target = demoDirectory.resolve(fileName);
        if (Files.exists(target)) {
            return target;
        }

        try {
            Files.writeString(target, content.stripIndent().trim() + System.lineSeparator(), StandardCharsets.UTF_8);
            return target;
        } catch (IOException exception) {
            throw new IllegalStateException("No fue posible crear el archivo demo " + fileName, exception);
        }
    }

    private String resolveFileType(String extension) {
        String normalized = extension.toLowerCase();
        return switch (normalized) {
            case "pdf" -> "PDF";
            case "doc", "docx" -> "WORD";
            case "ppt", "pptx" -> "PPT";
            default -> "OTRO";
        };
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

    private record SeedContext(Long loadId, Long userId) {
    }
}
