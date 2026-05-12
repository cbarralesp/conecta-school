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
        WHEN UPPER("CODIGO") LIKE 'PK%' THEN 'Inicial'
        WHEN UPPER("CODIGO") LIKE 'K%' AND UPPER("CODIGO") NOT LIKE 'PK%' THEN 'Inicial'
        WHEN UPPER("CODIGO") ~ '^[1-8][A-F]-' THEN 'Basico'
        WHEN UPPER("CODIGO") ~ '^[1-4]M[A-F]-' THEN 'Medio'
        ELSE "NIVEL"
    END
WHERE
    UPPER("CODIGO") LIKE 'PK%'
    OR (UPPER("CODIGO") LIKE 'K%' AND UPPER("CODIGO") NOT LIKE 'PK%')
    OR UPPER("CODIGO") ~ '^[1-8][A-F]-'
    OR UPPER("CODIGO") ~ '^[1-4]M[A-F]-';
