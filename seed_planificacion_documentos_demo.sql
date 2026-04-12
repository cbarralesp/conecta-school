WITH first_class AS (
    SELECT
        cp."ID" AS class_id,
        cp."UNIDAD_ID" AS unit_id,
        cp."CREADO_POR_USUARIO_ID" AS created_by_user_id
    FROM "CLASES_PLANIFICACION" cp
    ORDER BY cp."ID"
    LIMIT 1
),
second_class AS (
    SELECT
        cp."ID" AS class_id,
        cp."UNIDAD_ID" AS unit_id,
        cp."CREADO_POR_USUARIO_ID" AS created_by_user_id
    FROM "CLASES_PLANIFICACION" cp
    ORDER BY cp."ID"
    OFFSET 1
    LIMIT 1
),
word_target AS (
    SELECT * FROM first_class
),
pdf_target AS (
    SELECT * FROM second_class
    UNION ALL
    SELECT * FROM first_class
    WHERE NOT EXISTS (SELECT 1 FROM second_class)
    LIMIT 1
)
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
SELECT
    class_id,
    unit_id,
    'Guia_observacion_cielo_demo.docx',
    'guia_observacion_cielo_demo.docx',
    'docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    82,
    'uploads/planning-classes/guia_observacion_cielo_demo.docx',
    'WORD',
    TRUE,
    'ACTIVO',
    FALSE,
    created_by_user_id
FROM word_target
WHERE NOT EXISTS (
    SELECT 1
    FROM "CLASES_PLANIFICACION_DOCUMENTOS"
    WHERE "NOMBRE_ARCHIVO" = 'guia_observacion_cielo_demo.docx'
);

WITH first_class AS (
    SELECT
        cp."ID" AS class_id,
        cp."UNIDAD_ID" AS unit_id,
        cp."CREADO_POR_USUARIO_ID" AS created_by_user_id
    FROM "CLASES_PLANIFICACION" cp
    ORDER BY cp."ID"
    LIMIT 1
),
second_class AS (
    SELECT
        cp."ID" AS class_id,
        cp."UNIDAD_ID" AS unit_id,
        cp."CREADO_POR_USUARIO_ID" AS created_by_user_id
    FROM "CLASES_PLANIFICACION" cp
    ORDER BY cp."ID"
    OFFSET 1
    LIMIT 1
),
pdf_target AS (
    SELECT * FROM second_class
    UNION ALL
    SELECT * FROM first_class
    WHERE NOT EXISTS (SELECT 1 FROM second_class)
    LIMIT 1
)
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
SELECT
    class_id,
    unit_id,
    'Rubrica_unidad_demo.pdf',
    'rubrica_unidad_demo.pdf',
    'pdf',
    'application/pdf',
    582,
    'uploads/planning-classes/rubrica_unidad_demo.pdf',
    'PDF',
    FALSE,
    'ACTIVO',
    FALSE,
    created_by_user_id
FROM pdf_target
WHERE NOT EXISTS (
    SELECT 1
    FROM "CLASES_PLANIFICACION_DOCUMENTOS"
    WHERE "NOMBRE_ARCHIVO" = 'rubrica_unidad_demo.pdf'
);
