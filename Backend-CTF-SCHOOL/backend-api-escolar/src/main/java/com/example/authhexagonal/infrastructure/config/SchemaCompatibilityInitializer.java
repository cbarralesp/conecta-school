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
        ensureTeacherStaffType();
        ensureSchedulePeriodColumn();
        ensureScheduleCourseScope();
        ensureGradeEvaluationColumns();
        ensurePedagogicalReportsSchema();
        ensureCourseNormalizationSchema();
        ensureSubjectEvaluationType();
        ensureConceptualGradeValue();
        ensureEvaluationRegistrationType();
        ensureDiagnosticPercentageValue();
        ensureSubjectGradeScope();
        ensureSubjectCourseScope();
        ensureCourseEnrollmentConsistency();
        ensureActivityCourseScope();
        ensureAttendanceRegisterSuspensionMetadata();
        ensureSpecialActivityTypes();
        ensureEnrollmentExtendedContacts();
    }

    private void ensureTeacherStaffType() {
        jdbcTemplate.execute("""
                ALTER TABLE "PROFESORES"
                ADD COLUMN IF NOT EXISTS "TIPO_PERSONAL" character varying(30)
                """);

        jdbcTemplate.execute("""
                UPDATE "PROFESORES"
                SET "TIPO_PERSONAL" = COALESCE(NULLIF(TRIM("TIPO_PERSONAL"), ''), 'DOCENTE')
                WHERE "TIPO_PERSONAL" IS NULL
                   OR TRIM("TIPO_PERSONAL") = ''
                """);
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

    private void ensureScheduleCourseScope() {
        LOGGER.info("Verificando compatibilidad minima de esquema para horarios por curso");

        jdbcTemplate.execute("""
                ALTER TABLE "BLOQUES_HORARIOS"
                ADD COLUMN IF NOT EXISTS "CURSO_ID" BIGINT
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS "IDX_BLOQUES_HORARIOS_CURSO_ID"
                ON "BLOQUES_HORARIOS" ("CURSO_ID")
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_BLOQUES_HORARIOS_CURSO'
                    ) THEN
                        ALTER TABLE "BLOQUES_HORARIOS"
                        ADD CONSTRAINT "FK_BLOQUES_HORARIOS_CURSO"
                        FOREIGN KEY ("CURSO_ID") REFERENCES "CURSOS" ("ID");
                    END IF;
                END $$;
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'UK_BLOQUES_HORARIOS'
                    ) THEN
                        ALTER TABLE "BLOQUES_HORARIOS"
                        DROP CONSTRAINT "UK_BLOQUES_HORARIOS";
                    END IF;
                END $$;
                """);

        jdbcTemplate.execute("""
                DROP INDEX IF EXISTS "UK_BLOQUES_HORARIOS"
                """);

        jdbcTemplate.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS "UK_BLOQUES_HORARIOS_CURSO_DIA_ORDEN"
                ON "BLOQUES_HORARIOS" (COALESCE("CURSO_ID", 0), "DIA_SEMANA", "ORDEN")
                """);

        jdbcTemplate.execute("""
                INSERT INTO "BLOQUES_HORARIOS" (
                    "DIA_SEMANA",
                    "HORA_INICIO",
                    "HORA_FIN",
                    "ORDEN",
                    "TIPO_BLOQUE",
                    "CURSO_ID",
                    "ACTIVO"
                )
                SELECT
                    base."DIA_SEMANA",
                    base."HORA_INICIO",
                    base."HORA_FIN",
                    base."ORDEN",
                    base."TIPO_BLOQUE",
                    c."ID",
                    base."ACTIVO"
                FROM "CURSOS" c
                JOIN "BLOQUES_HORARIOS" base
                  ON base."CURSO_ID" IS NULL
                 AND base."ACTIVO" = TRUE
                WHERE c."ACTIVO" = TRUE
                  AND NOT EXISTS (
                      SELECT 1
                      FROM "BLOQUES_HORARIOS" scoped
                      WHERE scoped."CURSO_ID" = c."ID"
                        AND scoped."ACTIVO" = TRUE
                  )
                """);

        jdbcTemplate.execute("""
                UPDATE "HORARIOS_CARGAS" hc
                SET "BLOQUE_HORARIO_ID" = scoped."ID"
                FROM "CARGAS_DOCENTES" cd,
                     "BLOQUES_HORARIOS" original,
                     "BLOQUES_HORARIOS" scoped
                WHERE cd."ID" = hc."CARGA_DOCENTE_ID"
                  AND original."ID" = hc."BLOQUE_HORARIO_ID"
                  AND original."CURSO_ID" IS NULL
                  AND scoped."CURSO_ID" = cd."CURSO_ID"
                  AND scoped."DIA_SEMANA" = original."DIA_SEMANA"
                  AND scoped."ORDEN" = original."ORDEN"
                  AND scoped."ACTIVO" = TRUE
                """);
    }

    private void ensureGradeEvaluationColumns() {
        jdbcTemplate.execute("""
                ALTER TABLE "EVALUACIONES"
                ADD COLUMN IF NOT EXISTS "ACTIVA" BOOLEAN
                """);

        jdbcTemplate.execute("""
                UPDATE "EVALUACIONES"
                SET "ACTIVA" = TRUE
                WHERE "ACTIVA" IS NULL
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "EVALUACIONES"
                ALTER COLUMN "ACTIVA" SET DEFAULT TRUE
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "EVALUACIONES"
                ADD COLUMN IF NOT EXISTS "PONDERACION" NUMERIC(5,2)
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "EVALUACIONES"
                ADD COLUMN IF NOT EXISTS "FECHA_EVALUACION" DATE
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "EVALUACIONES"
                ADD COLUMN IF NOT EXISTS "CREADO_EN" TIMESTAMP
                """);

        jdbcTemplate.execute("""
                UPDATE "EVALUACIONES"
                SET "CREADO_EN" = CURRENT_TIMESTAMP
                WHERE "CREADO_EN" IS NULL
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "EVALUACIONES"
                ALTER COLUMN "CREADO_EN" SET DEFAULT CURRENT_TIMESTAMP
                """);
    }

    private void ensurePedagogicalReportsSchema() {
        LOGGER.info("Verificando compatibilidad minima de esquema para informes pedagogicos");

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS "INFORMES_PEDAGOGICOS" (
                    "ID" BIGSERIAL PRIMARY KEY,
                    "CURSO_ID" BIGINT NOT NULL REFERENCES "CURSOS" ("ID"),
                    "PERIODO_ID" BIGINT NOT NULL REFERENCES "PERIODOS_ACADEMICOS" ("ID"),
                    "ALUMNO_ID" BIGINT NOT NULL REFERENCES "ALUMNOS" ("ID"),
                    "CONTENIDO_JSON" JSONB NOT NULL DEFAULT '{}'::jsonb,
                    "ACTIVO" BOOLEAN NOT NULL DEFAULT TRUE,
                    "CREADO_EN" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "ACTUALIZADO_EN" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "UK_INFORMES_PEDAGOGICOS_CURSO_PERIODO_ALUMNO" UNIQUE ("CURSO_ID", "PERIODO_ID", "ALUMNO_ID")
                )
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS "IDX_INFORMES_PEDAGOGICOS_CURSO_PERIODO"
                ON "INFORMES_PEDAGOGICOS" ("CURSO_ID", "PERIODO_ID")
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS "IDX_INFORMES_PEDAGOGICOS_ALUMNO"
                ON "INFORMES_PEDAGOGICOS" ("ALUMNO_ID")
                """);
    }

    private void ensureEnrollmentExtendedContacts() {
        jdbcTemplate.execute("""
                ALTER TABLE "ALUMNOS"
                ADD COLUMN IF NOT EXISTS "CONVIVE_CON" character varying(120)
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "ALUMNOS"
                ADD COLUMN IF NOT EXISTS "ALERGIAS" character varying(500)
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "ALUMNOS"
                ADD COLUMN IF NOT EXISTS "DIAGNOSTICOS_ESPECIALISTAS" text
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "ALUMNOS"
                ADD COLUMN IF NOT EXISTS "CONTACTO_EMERGENCIA" character varying(255)
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "MATRICULA_APODERADOS"
                ADD COLUMN IF NOT EXISTS "FECHA_NACIMIENTO" DATE
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "MATRICULA_APODERADOS"
                ADD COLUMN IF NOT EXISTS "DIRECCION" character varying(255)
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "MATRICULA_APODERADOS"
                ADD COLUMN IF NOT EXISTS "ESCOLARIDAD" character varying(120)
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS "MATRICULA_PADRES" (
                    "ID" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    "MATRICULA_ID" bigint NOT NULL,
                    "RUN" character varying(20),
                    "NOMBRE" character varying(120),
                    "APELLIDOS" character varying(120),
                    "FECHA_NACIMIENTO" DATE,
                    "DIRECCION" character varying(255),
                    "TELEFONO" character varying(40),
                    "EMAIL" character varying(160),
                    "ESCOLARIDAD" character varying(120),
                    "ACTIVO" boolean DEFAULT TRUE NOT NULL
                )
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS "MATRICULA_MADRES" (
                    "ID" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    "MATRICULA_ID" bigint NOT NULL,
                    "RUN" character varying(20),
                    "NOMBRE" character varying(120),
                    "APELLIDOS" character varying(120),
                    "FECHA_NACIMIENTO" DATE,
                    "DIRECCION" character varying(255),
                    "TELEFONO" character varying(40),
                    "EMAIL" character varying(160),
                    "ESCOLARIDAD" character varying(120),
                    "ACTIVO" boolean DEFAULT TRUE NOT NULL
                )
                """);
    }

    private void ensureCourseNormalizationSchema() {
        LOGGER.info("Verificando compatibilidad minima de esquema para catalogo normalizado de cursos");

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS "CURSO_NIVELES" (
                    "ID" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    "NOMBRE" character varying(40) NOT NULL,
                    "ACTIVO" boolean DEFAULT TRUE NOT NULL,
                    CONSTRAINT "UK_CURSO_NIVELES_NOMBRE" UNIQUE ("NOMBRE")
                )
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS "CURSO_GRADOS" (
                    "ID" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    "NIVEL_ID" bigint NOT NULL,
                    "NOMBRE" character varying(60) NOT NULL,
                    "CODIGO_TOKEN" character varying(10) NOT NULL,
                    "ORDEN" integer NOT NULL,
                    "ACTIVO" boolean DEFAULT TRUE NOT NULL,
                    CONSTRAINT "UK_CURSO_GRADOS_NOMBRE" UNIQUE ("NOMBRE"),
                    CONSTRAINT "UK_CURSO_GRADOS_TOKEN" UNIQUE ("CODIGO_TOKEN"),
                    CONSTRAINT "UK_CURSO_GRADOS_ORDEN" UNIQUE ("ORDEN")
                )
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS "CURSO_JORNADAS" (
                    "ID" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    "CODIGO" character varying(20) NOT NULL,
                    "NOMBRE" character varying(30) NOT NULL,
                    "ACTIVO" boolean DEFAULT TRUE NOT NULL,
                    CONSTRAINT "UK_CURSO_JORNADAS_CODIGO" UNIQUE ("CODIGO"),
                    CONSTRAINT "UK_CURSO_JORNADAS_NOMBRE" UNIQUE ("NOMBRE")
                )
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "CURSOS_MAESTROS"
                ADD COLUMN IF NOT EXISTS "GRADO_ID" BIGINT
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "CURSOS"
                ADD COLUMN IF NOT EXISTS "GRADO_ID" BIGINT
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "CURSOS"
                ADD COLUMN IF NOT EXISTS "JORNADA_ID" BIGINT
                """);

        jdbcTemplate.execute("""
                INSERT INTO "CURSO_NIVELES" ("NOMBRE", "ACTIVO")
                SELECT level_name, TRUE
                FROM (VALUES ('Inicial'), ('Básico'), ('Medio')) AS levels(level_name)
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM "CURSO_NIVELES" existing
                    WHERE UPPER(TRANSLATE(existing."NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = UPPER(TRANSLATE(levels.level_name, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
                )
                """);

        jdbcTemplate.execute("""
                INSERT INTO "CURSO_GRADOS" ("NIVEL_ID", "NOMBRE", "CODIGO_TOKEN", "ORDEN", "ACTIVO")
                SELECT levels."ID", grades.grade_name, grades.code_token, grades.sort_order, TRUE
                FROM (
                    VALUES
                        ('Inicial', 'Prekínder', 'PK', 10),
                        ('Inicial', 'Kínder', 'K', 20),
                        ('Básico', '1 Básico', '1', 30),
                        ('Básico', '2 Básico', '2', 40),
                        ('Básico', '3 Básico', '3', 50),
                        ('Básico', '4 Básico', '4', 60),
                        ('Básico', '5 Básico', '5', 70),
                        ('Básico', '6 Básico', '6', 80),
                        ('Básico', '7 Básico', '7', 90),
                        ('Básico', '8 Básico', '8', 100),
                        ('Medio', '1 Medio', '1M', 110),
                        ('Medio', '2 Medio', '2M', 120),
                        ('Medio', '3 Medio', '3M', 130),
                        ('Medio', '4 Medio', '4M', 140)
                ) AS grades(level_name, grade_name, code_token, sort_order)
                JOIN "CURSO_NIVELES" levels
                  ON UPPER(TRANSLATE(levels."NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = UPPER(TRANSLATE(grades.level_name, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
                ON CONFLICT ("ORDEN") DO UPDATE
                SET "NIVEL_ID" = EXCLUDED."NIVEL_ID",
                    "NOMBRE" = EXCLUDED."NOMBRE",
                    "CODIGO_TOKEN" = EXCLUDED."CODIGO_TOKEN",
                    "ACTIVO" = EXCLUDED."ACTIVO"
                """);

        jdbcTemplate.execute("""
                INSERT INTO "CURSO_JORNADAS" ("CODIGO", "NOMBRE", "ACTIVO")
                SELECT jornada_code, jornada_name, TRUE
                FROM (VALUES
                    ('MANANA', 'Mañana'),
                    ('TARDE', 'Tarde'),
                    ('COMPLETA', 'Completa')
                ) AS jornadas(jornada_code, jornada_name)
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM "CURSO_JORNADAS" existing
                    WHERE UPPER(existing."CODIGO") = UPPER(jornadas.jornada_code)
                )
                """);

        jdbcTemplate.execute("""
                INSERT INTO "CURSOS_MAESTROS" ("CODIGO", "DESCRIPCION", "ACTIVO")
                SELECT course_code, grade_name, TRUE
                FROM (VALUES
                    ('CUR-PK', 'Prekínder'),
                    ('CUR-K', 'Kínder'),
                    ('CUR-1B', '1 Básico'),
                    ('CUR-2B', '2 Básico'),
                    ('CUR-3B', '3 Básico'),
                    ('CUR-4B', '4 Básico'),
                    ('CUR-5B', '5 Básico'),
                    ('CUR-6B', '6 Básico'),
                    ('CUR-7B', '7 Básico'),
                    ('CUR-8B', '8 Básico'),
                    ('CUR-1M', '1 Medio'),
                    ('CUR-2M', '2 Medio'),
                    ('CUR-3M', '3 Medio'),
                    ('CUR-4M', '4 Medio')
                ) AS masters(course_code, grade_name)
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM "CURSOS_MAESTROS" existing
                    WHERE UPPER(existing."CODIGO") = UPPER(masters.course_code)
                )
                """);

        jdbcTemplate.execute("""
                UPDATE "CURSO_NIVELES"
                SET "NOMBRE" = CASE
                    WHEN UPPER("NOMBRE") IN ('BASICO', 'BÁSICO') THEN 'Básico'
                    ELSE "NOMBRE"
                END
                """);

        jdbcTemplate.execute("""
                UPDATE "CURSO_GRADOS"
                SET "NOMBRE" = CASE
                    WHEN UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = 'PREKINDER' THEN 'Prekínder'
                    WHEN UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = 'KINDER' THEN 'Kínder'
                    WHEN UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = '1 BASICO' THEN '1 Básico'
                    WHEN UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = '2 BASICO' THEN '2 Básico'
                    WHEN UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = '3 BASICO' THEN '3 Básico'
                    WHEN UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = '4 BASICO' THEN '4 Básico'
                    WHEN UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = '5 BASICO' THEN '5 Básico'
                    WHEN UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = '6 BASICO' THEN '6 Básico'
                    WHEN UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = '7 BASICO' THEN '7 Básico'
                    WHEN UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = '8 BASICO' THEN '8 Básico'
                    ELSE "NOMBRE"
                END
                """);

        jdbcTemplate.execute("""
                UPDATE "CURSO_JORNADAS"
                SET "NOMBRE" = CASE
                    WHEN UPPER(TRANSLATE("NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = 'MANANA' THEN 'Mañana'
                    ELSE "NOMBRE"
                END
                """);

        jdbcTemplate.execute("""
                UPDATE "CURSOS_MAESTROS" cm
                SET "GRADO_ID" = cg."ID"
                FROM "CURSO_GRADOS" cg
                WHERE cm."GRADO_ID" IS NULL
                  AND (
                      (UPPER(cm."CODIGO") = 'CUR-PK' AND UPPER(cg."CODIGO_TOKEN") = 'PK')
                      OR (UPPER(cm."CODIGO") = 'CUR-K' AND UPPER(cg."CODIGO_TOKEN") = 'K')
                      OR (UPPER(cm."CODIGO") = 'CUR-1B' AND UPPER(cg."CODIGO_TOKEN") = '1')
                      OR (UPPER(cm."CODIGO") = 'CUR-2B' AND UPPER(cg."CODIGO_TOKEN") = '2')
                      OR (UPPER(cm."CODIGO") = 'CUR-3B' AND UPPER(cg."CODIGO_TOKEN") = '3')
                      OR (UPPER(cm."CODIGO") = 'CUR-4B' AND UPPER(cg."CODIGO_TOKEN") = '4')
                      OR (UPPER(cm."CODIGO") = 'CUR-5B' AND UPPER(cg."CODIGO_TOKEN") = '5')
                      OR (UPPER(cm."CODIGO") = 'CUR-6B' AND UPPER(cg."CODIGO_TOKEN") = '6')
                      OR (UPPER(cm."CODIGO") = 'CUR-7B' AND UPPER(cg."CODIGO_TOKEN") = '7')
                      OR (UPPER(cm."CODIGO") = 'CUR-8B' AND UPPER(cg."CODIGO_TOKEN") = '8')
                      OR (UPPER(cm."CODIGO") = 'CUR-1M' AND UPPER(cg."CODIGO_TOKEN") = '1M')
                      OR (UPPER(cm."CODIGO") = 'CUR-2M' AND UPPER(cg."CODIGO_TOKEN") = '2M')
                      OR (UPPER(cm."CODIGO") = 'CUR-3M' AND UPPER(cg."CODIGO_TOKEN") = '3M')
                      OR (UPPER(cm."CODIGO") = 'CUR-4M' AND UPPER(cg."CODIGO_TOKEN") = '4M')
                  )
                """);

        jdbcTemplate.execute("""
                UPDATE "CURSOS_MAESTROS" cm
                SET
                    "DESCRIPCION" = cg."NOMBRE",
                    "ACTIVO" = TRUE
                FROM "CURSO_GRADOS" cg
                WHERE cm."GRADO_ID" = cg."ID"
                """);

        jdbcTemplate.execute("""
                UPDATE "CURSOS" c
                SET "GRADO_ID" = cg."ID"
                FROM "CURSO_GRADOS" cg
                WHERE c."GRADO_ID" IS NULL
                  AND (
                      UPPER(TRANSLATE(c."NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = UPPER(TRANSLATE(cg."NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
                      OR UPPER(c."CODIGO") LIKE UPPER(cg."CODIGO_TOKEN") || '%'
                  )
                """);

        jdbcTemplate.execute("""
                UPDATE "CURSOS" c
                SET "JORNADA_ID" = cj."ID"
                FROM "CURSO_JORNADAS" cj
                WHERE c."JORNADA_ID" IS NULL
                  AND (
                      UPPER(TRANSLATE(c."JORNADA", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = UPPER(TRANSLATE(cj."NOMBRE", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
                      OR UPPER(TRANSLATE(c."JORNADA", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')) = UPPER(TRANSLATE(cj."CODIGO", 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'))
                  )
                """);

        jdbcTemplate.execute("""
                UPDATE "CURSOS" c
                SET
                    "NOMBRE" = cg."NOMBRE",
                    "NIVEL" = cn."NOMBRE",
                    "JORNADA" = COALESCE((
                        SELECT j."NOMBRE"
                        FROM "CURSO_JORNADAS" j
                        WHERE j."ID" = c."JORNADA_ID"
                    ), c."JORNADA")
                FROM "CURSO_GRADOS" cg
                JOIN "CURSO_NIVELES" cn ON cn."ID" = cg."NIVEL_ID"
                WHERE c."GRADO_ID" = cg."ID"
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS "IDX_CURSOS_GRADO_ID"
                ON "CURSOS" ("GRADO_ID")
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS "IDX_CURSOS_JORNADA_ID"
                ON "CURSOS" ("JORNADA_ID")
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS "IDX_CURSOS_MAESTROS_GRADO_ID"
                ON "CURSOS_MAESTROS" ("GRADO_ID")
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_CURSO_GRADOS_NIVEL'
                    ) THEN
                        ALTER TABLE "CURSO_GRADOS"
                        ADD CONSTRAINT "FK_CURSO_GRADOS_NIVEL"
                        FOREIGN KEY ("NIVEL_ID") REFERENCES "CURSO_NIVELES" ("ID");
                    END IF;
                END $$;
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_CURSOS_MAESTROS_GRADO'
                    ) THEN
                        ALTER TABLE "CURSOS_MAESTROS"
                        ADD CONSTRAINT "FK_CURSOS_MAESTROS_GRADO"
                        FOREIGN KEY ("GRADO_ID") REFERENCES "CURSO_GRADOS" ("ID");
                    END IF;
                END $$;
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_CURSOS_GRADO'
                    ) THEN
                        ALTER TABLE "CURSOS"
                        ADD CONSTRAINT "FK_CURSOS_GRADO"
                        FOREIGN KEY ("GRADO_ID") REFERENCES "CURSO_GRADOS" ("ID");
                    END IF;
                END $$;
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_CURSOS_JORNADA'
                    ) THEN
                        ALTER TABLE "CURSOS"
                        ADD CONSTRAINT "FK_CURSOS_JORNADA"
                        FOREIGN KEY ("JORNADA_ID") REFERENCES "CURSO_JORNADAS" ("ID");
                    END IF;
                END $$;
                """);
    }

    private void ensureCourseEnrollmentConsistency() {
        LOGGER.info("Verificando consistencia entre cursos reales y matrículas activas");

        jdbcTemplate.execute("""
                UPDATE "MATRICULAS" m
                SET "CURSO_ID" = canonical."ID"
                FROM "CURSOS" legacy
                JOIN LATERAL (
                    SELECT c2."ID"
                    FROM "CURSOS" c2
                    WHERE c2."ACTIVO" = TRUE
                      AND c2."ID" <> legacy."ID"
                      AND COALESCE(c2."GRADO_ID", -1) = COALESCE(legacy."GRADO_ID", -1)
                      AND COALESCE(c2."LETRA", '') = COALESCE(legacy."LETRA", '')
                      AND c2."ANIO_ESCOLAR" = legacy."ANIO_ESCOLAR"
                      AND COALESCE(c2."JORNADA_ID", -1) = COALESCE(legacy."JORNADA_ID", -1)
                    ORDER BY c2."ID"
                    LIMIT 1
                ) canonical ON TRUE
                WHERE m."CURSO_ID" = legacy."ID"
                  AND m."ACTIVA" = TRUE
                  AND legacy."ACTIVO" = FALSE
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'CURSO_ALUMNOS'
                    ) THEN
                        UPDATE "CURSO_ALUMNOS" ca
                        SET "CURSO_ID" = canonical."ID",
                            "ACTIVO" = TRUE
                        FROM "CURSOS" legacy
                        JOIN LATERAL (
                            SELECT c2."ID"
                            FROM "CURSOS" c2
                            WHERE c2."ACTIVO" = TRUE
                              AND c2."ID" <> legacy."ID"
                              AND COALESCE(c2."GRADO_ID", -1) = COALESCE(legacy."GRADO_ID", -1)
                              AND COALESCE(c2."LETRA", '') = COALESCE(legacy."LETRA", '')
                              AND c2."ANIO_ESCOLAR" = legacy."ANIO_ESCOLAR"
                              AND COALESCE(c2."JORNADA_ID", -1) = COALESCE(legacy."JORNADA_ID", -1)
                            ORDER BY c2."ID"
                            LIMIT 1
                        ) canonical ON TRUE
                        WHERE ca."CURSO_ID" = legacy."ID"
                          AND ca."ACTIVO" = TRUE
                          AND legacy."ACTIVO" = FALSE;
                    END IF;
                END $$;
                """);

        jdbcTemplate.execute("""
                UPDATE "CURSOS" c
                SET "ACTIVO" = TRUE
                WHERE c."ACTIVO" = FALSE
                  AND EXISTS (
                      SELECT 1
                      FROM "MATRICULAS" m
                      WHERE m."CURSO_ID" = c."ID"
                        AND m."ACTIVA" = TRUE
                  )
                """);
    }

    private void ensureSubjectGradeScope() {
        LOGGER.info("Verificando compatibilidad minima de esquema para grados aplicables por asignatura");

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS "ASIGNATURA_GRADOS" (
                    "ASIGNATURA_ID" bigint NOT NULL,
                    "GRADO_ID" bigint NOT NULL,
                    "ACTIVA" boolean DEFAULT TRUE NOT NULL,
                    CONSTRAINT "PK_ASIGNATURA_GRADOS" PRIMARY KEY ("ASIGNATURA_ID", "GRADO_ID")
                )
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS "IDX_ASIGNATURA_GRADOS_GRADO_ID"
                ON "ASIGNATURA_GRADOS" ("GRADO_ID")
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS "IDX_ASIGNATURA_GRADOS_ACTIVA"
                ON "ASIGNATURA_GRADOS" ("ACTIVA")
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_ASIGNATURA_GRADOS_ASIGNATURA'
                    ) THEN
                        ALTER TABLE "ASIGNATURA_GRADOS"
                        ADD CONSTRAINT "FK_ASIGNATURA_GRADOS_ASIGNATURA"
                        FOREIGN KEY ("ASIGNATURA_ID") REFERENCES "ASIGNATURAS" ("ID");
                    END IF;
                END $$;
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_ASIGNATURA_GRADOS_GRADO'
                    ) THEN
                        ALTER TABLE "ASIGNATURA_GRADOS"
                        ADD CONSTRAINT "FK_ASIGNATURA_GRADOS_GRADO"
                        FOREIGN KEY ("GRADO_ID") REFERENCES "CURSO_GRADOS" ("ID");
                    END IF;
                END $$;
                """);
    }

    private void ensureSubjectEvaluationType() {
        jdbcTemplate.execute("""
                ALTER TABLE "ASIGNATURAS"
                ADD COLUMN IF NOT EXISTS "TIPO_EVALUACION" character varying(20)
                """);

        jdbcTemplate.execute("""
                UPDATE "ASIGNATURAS"
                SET "TIPO_EVALUACION" = COALESCE(NULLIF(TRIM("TIPO_EVALUACION"), ''), 'NUMERICA')
                WHERE "TIPO_EVALUACION" IS NULL
                   OR TRIM("TIPO_EVALUACION") = ''
                """);
    }

    private void ensureConceptualGradeValue() {
        jdbcTemplate.execute("""
                ALTER TABLE "CALIFICACIONES"
                ADD COLUMN IF NOT EXISTS "VALOR_CONCEPTUAL" character varying(5)
                """);
    }

    private void ensureEvaluationRegistrationType() {
        jdbcTemplate.execute("""
                ALTER TABLE "EVALUACIONES"
                ADD COLUMN IF NOT EXISTS "TIPO_REGISTRO" character varying(20)
                """);

        jdbcTemplate.execute("""
                UPDATE "EVALUACIONES"
                SET "TIPO_REGISTRO" = COALESCE(NULLIF(TRIM("TIPO_REGISTRO"), ''), 'SUMATIVA')
                WHERE "TIPO_REGISTRO" IS NULL
                   OR TRIM("TIPO_REGISTRO") = ''
                """);
    }

    private void ensureDiagnosticPercentageValue() {
        jdbcTemplate.execute("""
                ALTER TABLE "CALIFICACIONES"
                ADD COLUMN IF NOT EXISTS "PORCENTAJE_LOGRO" numeric(5,2)
                """);
    }

    private void ensureSubjectCourseScope() {
        LOGGER.info("Verificando compatibilidad minima de esquema para cursos aplicables por asignatura");

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS "ASIGNATURA_CURSOS" (
                    "ASIGNATURA_ID" bigint NOT NULL,
                    "CURSO_ID" bigint NOT NULL,
                    "ACTIVA" boolean DEFAULT TRUE NOT NULL,
                    CONSTRAINT "PK_ASIGNATURA_CURSOS" PRIMARY KEY ("ASIGNATURA_ID", "CURSO_ID")
                )
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS "IDX_ASIGNATURA_CURSOS_CURSO_ID"
                ON "ASIGNATURA_CURSOS" ("CURSO_ID")
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS "IDX_ASIGNATURA_CURSOS_ACTIVA"
                ON "ASIGNATURA_CURSOS" ("ACTIVA")
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_ASIGNATURA_CURSOS_ASIGNATURA'
                    ) THEN
                        ALTER TABLE "ASIGNATURA_CURSOS"
                        ADD CONSTRAINT "FK_ASIGNATURA_CURSOS_ASIGNATURA"
                        FOREIGN KEY ("ASIGNATURA_ID") REFERENCES "ASIGNATURAS" ("ID");
                    END IF;
                END $$;
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_ASIGNATURA_CURSOS_CURSO'
                    ) THEN
                        ALTER TABLE "ASIGNATURA_CURSOS"
                        ADD CONSTRAINT "FK_ASIGNATURA_CURSOS_CURSO"
                        FOREIGN KEY ("CURSO_ID") REFERENCES "CURSOS" ("ID");
                    END IF;
                END $$;
                """);

        jdbcTemplate.execute("""
                INSERT INTO "ASIGNATURA_CURSOS" ("ASIGNATURA_ID", "CURSO_ID", "ACTIVA")
                SELECT DISTINCT ca."ASIGNATURA_ID", ca."CURSO_ID", TRUE
                FROM "CURSO_ASIGNATURAS" ca
                WHERE COALESCE(ca."ACTIVA", TRUE) = TRUE
                  AND NOT EXISTS (
                      SELECT 1
                      FROM "CARGAS_DOCENTES" cd
                      WHERE cd."ASIGNATURA_ID" = ca."ASIGNATURA_ID"
                        AND cd."ACTIVA" = TRUE
                        AND NOT EXISTS (
                            SELECT 1
                            FROM "CURSO_ASIGNATURAS" ca_scope
                            WHERE ca_scope."ASIGNATURA_ID" = cd."ASIGNATURA_ID"
                              AND ca_scope."CURSO_ID" = cd."CURSO_ID"
                              AND COALESCE(ca_scope."ACTIVA", TRUE) = TRUE
                        )
                  )
                ON CONFLICT ("ASIGNATURA_ID", "CURSO_ID")
                DO UPDATE SET "ACTIVA" = EXCLUDED."ACTIVA"
                """);
    }

    private void ensureActivityCourseScope() {
        LOGGER.info("Verificando compatibilidad minima de esquema para actividades por curso");

        jdbcTemplate.execute("""
                ALTER TABLE "ACTIVIDADES_ESCOLARES"
                ADD COLUMN IF NOT EXISTS "CURSO_ID" BIGINT
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS "IDX_ACTIVIDADES_ESCOLARES_CURSO_ID"
                ON "ACTIVIDADES_ESCOLARES" ("CURSO_ID")
                """);

        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'ACTIVIDADES_ESCOLARES_CURSO_ID_fkey'
                    ) THEN
                        ALTER TABLE "ACTIVIDADES_ESCOLARES"
                        ADD CONSTRAINT "ACTIVIDADES_ESCOLARES_CURSO_ID_fkey"
                        FOREIGN KEY ("CURSO_ID") REFERENCES "CURSOS" ("ID");
                    END IF;
                END $$;
                """);
    }

    private void ensureAttendanceRegisterSuspensionMetadata() {
        jdbcTemplate.execute("""
                ALTER TABLE "ASISTENCIA_REGISTROS"
                ADD COLUMN IF NOT EXISTS "CLASES_SUSPENDIDAS" BOOLEAN DEFAULT FALSE NOT NULL
                """);

        jdbcTemplate.execute("""
                ALTER TABLE "ASISTENCIA_REGISTROS"
                ADD COLUMN IF NOT EXISTS "MOTIVO_SUSPENSION" character varying(255)
                """);

        jdbcTemplate.execute("""
                UPDATE "ASISTENCIA_REGISTROS"
                SET "CLASES_SUSPENDIDAS" = COALESCE("CLASES_SUSPENDIDAS", FALSE)
                WHERE "CLASES_SUSPENDIDAS" IS NULL
                """);
    }

    private void ensureSpecialActivityTypes() {
        jdbcTemplate.execute("""
                INSERT INTO "TIPOS_ACTIVIDAD" ("CODIGO", "NOMBRE", "DESCRIPCION", "COLOR_FONDO", "COLOR_TEXTO", "ICONO", "ACTIVO")
                VALUES
                    ('TRANSVERSAL', 'Transversal (Todos los cursos)', 'Actividad publicada para todos los cursos del calendario institucional.', '#E0F2FE', '#0F4C81', 'groups', TRUE),
                    ('VACACIONES', 'Vacaciones', 'Periodo sin clases que aplica para todos los cursos.', '#DBEAFE', '#1D4ED8', 'beach_access', TRUE),
                    ('FERIADO', 'Feriado', 'Dia feriado sin clases para todos los cursos.', '#FCE7F3', '#BE185D', 'celebration', TRUE),
                    ('INTERFERIADO', 'Interferiado', 'Dia puente sin clases que aplica para todos los cursos.', '#FDE68A', '#92400E', 'event_available', TRUE),
                    ('SUSPENSION', 'Suspension', 'Suspension institucional de clases para todos los cursos.', '#E2E8F0', '#475569', 'event_busy', TRUE)
                ON CONFLICT ("CODIGO") DO UPDATE
                SET
                    "NOMBRE" = EXCLUDED."NOMBRE",
                    "DESCRIPCION" = EXCLUDED."DESCRIPCION",
                    "COLOR_FONDO" = EXCLUDED."COLOR_FONDO",
                    "COLOR_TEXTO" = EXCLUDED."COLOR_TEXTO",
                    "ICONO" = EXCLUDED."ICONO",
                    "ACTIVO" = TRUE
                """);
    }

}

