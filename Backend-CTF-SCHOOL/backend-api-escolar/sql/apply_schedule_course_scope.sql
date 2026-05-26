ALTER TABLE "BLOQUES_HORARIOS"
ADD COLUMN IF NOT EXISTS "CURSO_ID" BIGINT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'BLOQUES_HORARIOS'
          AND constraint_name = 'FK_BLOQUES_HORARIOS_CURSO'
    ) THEN
        ALTER TABLE "BLOQUES_HORARIOS"
        ADD CONSTRAINT "FK_BLOQUES_HORARIOS_CURSO"
        FOREIGN KEY ("CURSO_ID") REFERENCES "CURSOS" ("ID");
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'BLOQUES_HORARIOS'
          AND constraint_name = 'UK_BLOQUES_HORARIOS'
    ) THEN
        ALTER TABLE "BLOQUES_HORARIOS" DROP CONSTRAINT "UK_BLOQUES_HORARIOS";
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "UK_BLOQUES_HORARIOS_CURSO_DIA_ORDEN"
ON "BLOQUES_HORARIOS" (COALESCE("CURSO_ID", 0), "DIA_SEMANA", "ORDEN");

DO $$
DECLARE
    prekinder_course_id BIGINT;
BEGIN
    SELECT c."ID"
    INTO prekinder_course_id
    FROM "CURSOS" c
    WHERE c."ACTIVO" = TRUE
      AND UPPER(TRANSLATE(COALESCE(c."NOMBRE", ''), 'áéíóúÁÉÍÓÚüÜñÑ', 'aeiouAEIOUuUnN')) LIKE '%PREKINDER%'
    ORDER BY c."ANIO_ESCOLAR" DESC, c."ID"
    LIMIT 1;

    IF prekinder_course_id IS NULL THEN
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM "BLOQUES_HORARIOS"
        WHERE "CURSO_ID" = prekinder_course_id
          AND "ACTIVO" = TRUE
    ) THEN
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
            "DIA_SEMANA",
            "HORA_INICIO",
            "HORA_FIN",
            "ORDEN",
            "TIPO_BLOQUE",
            prekinder_course_id,
            "ACTIVO"
        FROM "BLOQUES_HORARIOS"
        WHERE "CURSO_ID" IS NULL
          AND "ACTIVO" = TRUE;

        UPDATE "HORARIOS_CARGAS" hc
        SET "BLOQUE_HORARIO_ID" = scoped."ID"
        FROM "CARGAS_DOCENTES" cd,
             "BLOQUES_HORARIOS" original,
             "BLOQUES_HORARIOS" scoped
        WHERE cd."ID" = hc."CARGA_DOCENTE_ID"
          AND cd."CURSO_ID" = prekinder_course_id
          AND original."ID" = hc."BLOQUE_HORARIO_ID"
          AND original."CURSO_ID" IS NULL
          AND scoped."CURSO_ID" = prekinder_course_id
          AND scoped."DIA_SEMANA" = original."DIA_SEMANA"
          AND scoped."ORDEN" = original."ORDEN";
    END IF;

    UPDATE "BLOQUES_HORARIOS"
    SET "HORA_FIN" = TIME '10:00:00'
    WHERE "CURSO_ID" IS NULL
      AND "ACTIVO" = TRUE
      AND "ORDEN" = 2
      AND "HORA_INICIO" = TIME '08:45:00'
      AND "HORA_FIN" = TIME '09:15:00';

    UPDATE "BLOQUES_HORARIOS"
    SET "ACTIVO" = FALSE
    WHERE "CURSO_ID" IS NULL
      AND "ACTIVO" = TRUE
      AND "ORDEN" = 3
      AND "HORA_INICIO" = TIME '09:15:00'
      AND "HORA_FIN" = TIME '10:00:00';
END $$;
