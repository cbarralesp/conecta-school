TRUNCATE TABLE "CURSOS_MAESTROS" RESTART IDENTITY;

INSERT INTO "CURSOS_MAESTROS" ("CODIGO", "DESCRIPCION", "ACTIVO") VALUES
    ('CUR-PK', 'Prekinder', TRUE),
    ('CUR-K', 'Kinder', TRUE),
    ('CUR-1B', 'Primero Basico', TRUE),
    ('CUR-2B', 'Segundo Basico', TRUE),
    ('CUR-3B', 'Tercero Basico', TRUE),
    ('CUR-4B', 'Cuarto Basico', TRUE),
    ('CUR-5B', 'Quinto Basico', TRUE),
    ('CUR-6B', 'Sexto Basico', TRUE),
    ('CUR-7B', 'Septimo Basico', TRUE),
    ('CUR-8B', 'Octavo Basico', TRUE),
    ('CUR-1M', 'Primero Medio', TRUE),
    ('CUR-2M', 'Segundo Medio', TRUE),
    ('CUR-3M', 'Tercero Medio', TRUE),
    ('CUR-4M', 'Cuarto Medio', TRUE);

UPDATE "CURSOS"
SET "NOMBRE" = TRIM(REGEXP_REPLACE("NOMBRE", '\s+' || "LETRA" || '$', ''))
WHERE COALESCE("LETRA", '') <> ''
  AND UPPER("NOMBRE") LIKE '%' || UPPER("LETRA");

UPDATE "CURSOS"
SET
    "NOMBRE" = CASE
        WHEN UPPER("CODIGO") LIKE 'PK%' THEN 'Prekinder'
        WHEN UPPER("CODIGO") LIKE 'K%' AND UPPER("CODIGO") NOT LIKE 'PK%' THEN 'Kinder'
        WHEN UPPER("CODIGO") ~ '^[1-8][A-F]-' THEN SUBSTRING(UPPER("CODIGO") FROM '^([1-8])') || ' Basico'
        WHEN UPPER("CODIGO") ~ '^[1-4]M[A-F]-' THEN SUBSTRING(UPPER("CODIGO") FROM '^([1-4])') || ' Medio'
        ELSE "NOMBRE"
    END,
    "NIVEL" = CASE
        WHEN UPPER("CODIGO") LIKE 'PK%' THEN 'Prekinder'
        WHEN UPPER("CODIGO") LIKE 'K%' AND UPPER("CODIGO") NOT LIKE 'PK%' THEN 'Kinder'
        WHEN UPPER("CODIGO") ~ '^[1-8][A-F]-' THEN SUBSTRING(UPPER("CODIGO") FROM '^([1-8])') || ' Basico'
        WHEN UPPER("CODIGO") ~ '^[1-4]M[A-F]-' THEN SUBSTRING(UPPER("CODIGO") FROM '^([1-4])') || ' Medio'
        ELSE "NIVEL"
    END
WHERE
    UPPER("CODIGO") LIKE 'PK%'
    OR (UPPER("CODIGO") LIKE 'K%' AND UPPER("CODIGO") NOT LIKE 'PK%')
    OR UPPER("CODIGO") ~ '^[1-8][A-F]-'
    OR UPPER("CODIGO") ~ '^[1-4]M[A-F]-';
