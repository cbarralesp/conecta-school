SELECT ordered."ID", ordered."NOMBRE", ordered."ANIO_ESCOLAR"
FROM (
    SELECT DISTINCT
        c."ID",
        c."NOMBRE",
        c."ANIO_ESCOLAR",
        CASE
            WHEN UPPER(c."NOMBRE") LIKE '%PK%' THEN 0
            WHEN UPPER(c."NOMBRE") LIKE '%KINDER%' THEN 1
            ELSE 2
        END AS sort_priority
    FROM "CURSOS" c
    JOIN "MATRICULAS" m ON m."CURSO_ID" = c."ID"
    WHERE c."ACTIVO" = TRUE
      AND m."ACTIVA" = TRUE
) ordered
ORDER BY ordered.sort_priority, ordered."NOMBRE";
