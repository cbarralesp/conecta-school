package com.example.authhexagonal.infrastructure.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SchemaCompatibilityInitializer {

    private static final Logger LOGGER = LoggerFactory.getLogger(SchemaCompatibilityInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public SchemaCompatibilityInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureSchemaCompatibility() {
        LOGGER.info("Verificando compatibilidad minima de esquema para horarios y calificaciones");
        ensureSchedulePeriodColumn();
        ensureGradeEvaluationColumns();
    }

    private void ensureSchedulePeriodColumn() {
        jdbcTemplate.execute("""
                ALTER TABLE "CARGAS_DOCENTES"
                ADD COLUMN IF NOT EXISTS "PERIODO_ID" BIGINT
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS "IDX_CARGAS_DOCENTES_PERIODO_CURSO_ACTIVA"
                ON "CARGAS_DOCENTES" ("PERIODO_ID", "CURSO_ID", "ACTIVA")
                """);

        jdbcTemplate.execute("""
                UPDATE "CARGAS_DOCENTES" cd
                SET "PERIODO_ID" = periods."ID"
                FROM (
                    SELECT DISTINCT ON (p."ANIO")
                        p."ANIO",
                        p."ID"
                    FROM "PERIODOS_ACADEMICOS" p
                    WHERE p."ACTIVO" = TRUE
                    ORDER BY p."ANIO" DESC, p."SEMESTRE" ASC, p."ID" ASC
                ) periods
                WHERE cd."PERIODO_ID" IS NULL
                  AND cd."ANIO_ESCOLAR" = periods."ANIO"
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = current_schema()
                          AND table_name = 'PERIODOS_ACADEMICOS'
                    ) AND NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_CARGAS_DOCENTES_PERIODO'
                    ) THEN
                        ALTER TABLE "CARGAS_DOCENTES"
                        ADD CONSTRAINT "FK_CARGAS_DOCENTES_PERIODO"
                        FOREIGN KEY ("PERIODO_ID") REFERENCES "PERIODOS_ACADEMICOS" ("ID");
                    END IF;
                END $$;
                """);
    }

    private void ensureGradeEvaluationColumns() {
        jdbcTemplate.execute("""
                ALTER TABLE "EVALUACIONES"
                ADD COLUMN IF NOT EXISTS "PONDERACION" NUMERIC(5,2)
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "EVALUACIONES"
                ADD COLUMN IF NOT EXISTS "FECHA_EVALUACION" DATE
                """);
    }
}
