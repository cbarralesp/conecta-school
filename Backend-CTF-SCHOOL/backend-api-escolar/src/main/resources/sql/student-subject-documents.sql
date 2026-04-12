-- Portal del alumno: documentos por asignatura
-- Fecha: 2026-04-10
-- Uso:
-- 1. Ejecutar la creacion de tabla e indices.
-- 2. Mantener las consultas como referencia de soporte para JdbcTemplate.

CREATE TABLE IF NOT EXISTS "ALUMNO_DOCUMENTO_ESTADO" (
    "ID" BIGSERIAL PRIMARY KEY,
    "ALUMNO_ID" BIGINT NOT NULL REFERENCES "ALUMNOS" ("ID"),
    "DOCUMENTO_ID" BIGINT NOT NULL REFERENCES "CLASES_PLANIFICACION_DOCUMENTOS" ("ID"),
    "REVISADO" BOOLEAN NOT NULL DEFAULT FALSE,
    "FECHA_REVISION" TIMESTAMP NULL,
    "DESCARGADO" BOOLEAN NOT NULL DEFAULT FALSE,
    "FECHA_DESCARGA" TIMESTAMP NULL,
    "CREADO_EN" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ACTUALIZADO_EN" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UK_ALUMNO_DOCUMENTO_ESTADO_ALUMNO_DOCUMENTO" UNIQUE ("ALUMNO_ID", "DOCUMENTO_ID")
);

CREATE INDEX IF NOT EXISTS "IDX_ALUMNO_DOCUMENTO_ESTADO_ALUMNO"
    ON "ALUMNO_DOCUMENTO_ESTADO" ("ALUMNO_ID");

CREATE INDEX IF NOT EXISTS "IDX_ALUMNO_DOCUMENTO_ESTADO_DOCUMENTO"
    ON "ALUMNO_DOCUMENTO_ESTADO" ("DOCUMENTO_ID");

CREATE INDEX IF NOT EXISTS "IDX_ALUMNO_DOCUMENTO_ESTADO_REVISADO"
    ON "ALUMNO_DOCUMENTO_ESTADO" ("ALUMNO_ID", "REVISADO");

CREATE INDEX IF NOT EXISTS "IDX_MATRICULAS_ALUMNO_ACTIVA"
    ON "MATRICULAS" ("ALUMNO_ID", "ACTIVA");

CREATE INDEX IF NOT EXISTS "IDX_CARGAS_DOCENTES_CURSO_ACTIVA"
    ON "CARGAS_DOCENTES" ("CURSO_ID", "ACTIVA");

CREATE INDEX IF NOT EXISTS "IDX_UNIDADES_PLANIFICACION_CARGA"
    ON "UNIDADES_PLANIFICACION" ("CARGA_DOCENTE_ID");

CREATE INDEX IF NOT EXISTS "IDX_CLASES_PLANIFICACION_UNIDAD"
    ON "CLASES_PLANIFICACION" ("UNIDAD_ID");

CREATE INDEX IF NOT EXISTS "IDX_CLASES_PLANIFICACION_DOCUMENTOS_VISIBILIDAD"
    ON "CLASES_PLANIFICACION_DOCUMENTOS" ("VISIBLE_ALUMNOS", "ESTADO", "ELIMINADO");

CREATE INDEX IF NOT EXISTS "IDX_CLASES_PLANIFICACION_DOCUMENTOS_UNIDAD"
    ON "CLASES_PLANIFICACION_DOCUMENTOS" ("UNIDAD_ID");

CREATE INDEX IF NOT EXISTS "IDX_CLASES_PLANIFICACION_DOCUMENTOS_CLASE"
    ON "CLASES_PLANIFICACION_DOCUMENTOS" ("CLASE_ID");

-- ============================================================
-- Consulta 1: listado de asignaturas activas del alumno
-- ============================================================
WITH student_context AS (
    SELECT
        a."ID" AS student_id,
        c."ID" AS course_id,
        c."NOMBRE" AS course_name,
        c."ANIO_ESCOLAR" AS school_year
    FROM "USUARIOS" u
    JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
    JOIN "ALUMNOS" a ON UPPER(a."RUN") = UPPER(p."RUN")
    JOIN "MATRICULAS" m ON m."ALUMNO_ID" = a."ID" AND m."ACTIVA" = TRUE
    JOIN "CURSOS" c ON c."ID" = m."CURSO_ID" AND c."ACTIVO" = TRUE
    WHERE UPPER(u."USUARIO") = UPPER(:username)
       OR UPPER(COALESCE(p."CORREO_ELECTRONICO", '')) = UPPER(:username)
)
SELECT
    s."ID" AS subject_id,
    s."NOMBRE" AS subject_name,
    sc.course_name,
    COALESCE(COUNT(DISTINCT hc."ID"), 0) AS weekly_blocks,
    TRIM(COALESCE(tp."NOMBRE", '') || ' ' || COALESCE(tp."APELLIDOS", '')) AS teacher_name,
    COUNT(DISTINCT docs.document_id) AS total_documents,
    COUNT(DISTINCT CASE WHEN docs.reviewed = FALSE THEN docs.document_id END) AS new_documents
FROM student_context sc
JOIN "CARGAS_DOCENTES" cd ON cd."CURSO_ID" = sc.course_id AND cd."ACTIVA" = TRUE
JOIN "ASIGNATURAS" s ON s."ID" = cd."ASIGNATURA_ID" AND s."ACTIVA" = TRUE
LEFT JOIN "HORARIOS_CARGAS" hc ON hc."CARGA_DOCENTE_ID" = cd."ID"
LEFT JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
LEFT JOIN "PERSONAS" tp ON tp."ID" = pr."PERSONA_ID"
LEFT JOIN LATERAL (
    SELECT
        pd."ID" AS document_id,
        COALESCE(ade."REVISADO", FALSE) AS reviewed
    FROM "UNIDADES_PLANIFICACION" up
    JOIN "CLASES_PLANIFICACION_DOCUMENTOS" pd
        ON COALESCE(pd."ELIMINADO", FALSE) = FALSE
       AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
       AND COALESCE(pd."VISIBLE_ALUMNOS", FALSE) = TRUE
    LEFT JOIN "CLASES_PLANIFICACION" cp_doc ON cp_doc."ID" = pd."CLASE_ID"
    LEFT JOIN "ALUMNO_DOCUMENTO_ESTADO" ade
        ON ade."ALUMNO_ID" = sc.student_id
       AND ade."DOCUMENTO_ID" = pd."ID"
    WHERE up."CARGA_DOCENTE_ID" = cd."ID"
      AND (
          pd."UNIDAD_ID" = up."ID"
          OR cp_doc."UNIDAD_ID" = up."ID"
      )
      AND (
          pd."CLASE_ID" IS NULL
          OR COALESCE(cp_doc."PUBLICADO_A_ALUMNOS", FALSE) = TRUE
      )
) docs ON TRUE
GROUP BY
    s."ID",
    s."NOMBRE",
    sc.course_name,
    tp."NOMBRE",
    tp."APELLIDOS"
ORDER BY s."NOMBRE";

-- ============================================================
-- Consulta 2: detalle de documentos de una asignatura
-- ============================================================
WITH student_context AS (
    SELECT
        a."ID" AS student_id,
        c."ID" AS course_id
    FROM "USUARIOS" u
    JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
    JOIN "ALUMNOS" a ON UPPER(a."RUN") = UPPER(p."RUN")
    JOIN "MATRICULAS" m ON m."ALUMNO_ID" = a."ID" AND m."ACTIVA" = TRUE
    JOIN "CURSOS" c ON c."ID" = m."CURSO_ID" AND c."ACTIVO" = TRUE
    WHERE UPPER(u."USUARIO") = UPPER(:username)
       OR UPPER(COALESCE(p."CORREO_ELECTRONICO", '')) = UPPER(:username)
)
SELECT
    up."ID" AS unit_id,
    up."NUMERO_UNIDAD" AS unit_code,
    up."NOMBRE" AS unit_name,
    COALESCE(up."SEMANAS_ESTIMADAS", 0) AS duration_weeks,
    cp."ID" AS class_id,
    COALESCE(cp."TITULO", 'Material general de la unidad') AS class_title,
    cp."FECHA_PLANIFICADA" AS class_date,
    pd."ID" AS document_id,
    pd."NOMBRE_ORIGINAL" AS file_name,
    COALESCE(pd."EXTENSION", '') AS extension,
    COALESCE(pd."MIME_TYPE", 'application/octet-stream') AS mime_type,
    COALESCE(pd."PESO_BYTES", 0) AS file_size_bytes,
    pd."FECHA_CARGA" AS published_at,
    COALESCE(ade."REVISADO", FALSE) AS reviewed
FROM student_context sc
JOIN "CARGAS_DOCENTES" cd ON cd."CURSO_ID" = sc.course_id AND cd."ACTIVA" = TRUE
JOIN "ASIGNATURAS" s ON s."ID" = cd."ASIGNATURA_ID" AND s."ACTIVA" = TRUE AND s."ID" = :subjectId
JOIN "UNIDADES_PLANIFICACION" up ON up."CARGA_DOCENTE_ID" = cd."ID"
JOIN "CLASES_PLANIFICACION_DOCUMENTOS" pd
    ON COALESCE(pd."ELIMINADO", FALSE) = FALSE
   AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
   AND COALESCE(pd."VISIBLE_ALUMNOS", FALSE) = TRUE
LEFT JOIN "CLASES_PLANIFICACION" cp ON cp."ID" = pd."CLASE_ID"
LEFT JOIN "ALUMNO_DOCUMENTO_ESTADO" ade
    ON ade."ALUMNO_ID" = sc.student_id
   AND ade."DOCUMENTO_ID" = pd."ID"
WHERE (
    pd."UNIDAD_ID" = up."ID"
    OR cp."UNIDAD_ID" = up."ID"
)
  AND (
    pd."CLASE_ID" IS NULL
    OR COALESCE(cp."PUBLICADO_A_ALUMNOS", FALSE) = TRUE
)
ORDER BY
    COALESCE(up."FECHA_INICIO", up."FECHA_CREACION") DESC NULLS LAST,
    up."ID" DESC,
    cp."FECHA_PLANIFICADA" ASC NULLS LAST,
    cp."ID" ASC NULLS LAST,
    COALESCE(ade."REVISADO", FALSE) ASC,
    pd."FECHA_CARGA" DESC,
    pd."ID" DESC;

-- ============================================================
-- Consulta 3: marcar documento como revisado
-- ============================================================
WITH student_context AS (
    SELECT a."ID" AS student_id
    FROM "USUARIOS" u
    JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
    JOIN "ALUMNOS" a ON UPPER(a."RUN") = UPPER(p."RUN")
    WHERE UPPER(u."USUARIO") = UPPER(:username)
       OR UPPER(COALESCE(p."CORREO_ELECTRONICO", '')) = UPPER(:username)
),
accessible_document AS (
    SELECT DISTINCT pd."ID"
    FROM student_context sc
    JOIN "MATRICULAS" m ON m."ALUMNO_ID" = sc.student_id AND m."ACTIVA" = TRUE
    JOIN "CURSOS" c ON c."ID" = m."CURSO_ID" AND c."ACTIVO" = TRUE
    JOIN "CLASES_PLANIFICACION_DOCUMENTOS" pd
        ON pd."ID" = :documentId
       AND COALESCE(pd."ELIMINADO", FALSE) = FALSE
       AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
       AND COALESCE(pd."VISIBLE_ALUMNOS", FALSE) = TRUE
    LEFT JOIN "CLASES_PLANIFICACION" cp_doc ON cp_doc."ID" = pd."CLASE_ID"
    JOIN "UNIDADES_PLANIFICACION" up
        ON up."ID" = COALESCE(pd."UNIDAD_ID", cp_doc."UNIDAD_ID")
    JOIN "CARGAS_DOCENTES" cd
        ON cd."ID" = up."CARGA_DOCENTE_ID"
       AND cd."CURSO_ID" = c."ID"
       AND cd."ACTIVA" = TRUE
    WHERE (
        pd."CLASE_ID" IS NULL
        OR COALESCE(cp_doc."PUBLICADO_A_ALUMNOS", FALSE) = TRUE
    )
)
INSERT INTO "ALUMNO_DOCUMENTO_ESTADO" (
    "ALUMNO_ID",
    "DOCUMENTO_ID",
    "REVISADO",
    "FECHA_REVISION",
    "DESCARGADO",
    "FECHA_DESCARGA"
)
SELECT
    sc.student_id,
    ad."ID",
    TRUE,
    CURRENT_TIMESTAMP,
    FALSE,
    NULL
FROM student_context sc
JOIN accessible_document ad ON 1 = 1
ON CONFLICT ("ALUMNO_ID", "DOCUMENTO_ID")
DO UPDATE SET
    "REVISADO" = TRUE,
    "FECHA_REVISION" = CURRENT_TIMESTAMP,
    "ACTUALIZADO_EN" = CURRENT_TIMESTAMP;
