-- ============================================================
-- PLANIFICACION > RESUMEN SEMESTRAL
-- Consultas de lectura para el dashboard principal del modulo.
-- No crea tablas nuevas: reutiliza UNIDADES_PLANIFICACION,
-- CLASES_PLANIFICACION y CLASES_PLANIFICACION_DOCUMENTOS.
-- ============================================================

-- ------------------------------------------------------------
-- INDICES RECOMENDADOS
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_unidades_planificacion_carga_fechas
    ON "UNIDADES_PLANIFICACION" ("CARGA_DOCENTE_ID", "SEMANA_INICIO", "FECHA_INICIO", "FECHA_TERMINO");

CREATE INDEX IF NOT EXISTS idx_clases_planificacion_unidad_estado
    ON "CLASES_PLANIFICACION" ("UNIDAD_ID", "ESTADO");

CREATE INDEX IF NOT EXISTS idx_clases_planificacion_documentos_resumen
    ON "CLASES_PLANIFICACION_DOCUMENTOS" ("UNIDAD_ID", "ELIMINADO", "ESTADO", "VISIBLE_ALUMNOS");

-- ------------------------------------------------------------
-- PARAMETROS DE EJEMPLO
-- :username  -> usuario autenticado
-- :year      -> anio escolar opcional
-- :subjectId -> asignatura opcional
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- BASE DE ACCESO
-- Usa CARGAS_DOCENTES como fuente real docente.
-- ------------------------------------------------------------
WITH current_user AS (
    SELECT
        u."PERSONA_ID" AS persona_id,
        COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
    FROM "USUARIOS" u
    LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
    LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
    WHERE u."USUARIO" = :username
)
SELECT
    up."ID" AS unit_id,
    up."NUMERO_UNIDAD",
    up."NOMBRE" AS unit_name,
    up."SEMANA_INICIO",
    up."SEMANAS_ESTIMADAS",
    up."CLASES_PLANIFICADAS",
    up."FECHA_INICIO",
    up."FECHA_TERMINO",
    a."ID" AS subject_id,
    a."NOMBRE" AS subject_name,
    c."ID" AS course_id,
    c."NOMBRE" AS course_name
FROM current_user cu
JOIN "UNIDADES_PLANIFICACION" up ON 1 = 1
JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
WHERE (
    cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')
    OR pr."PERSONA_ID" = cu.persona_id
)
AND (:year IS NULL OR cd."ANIO_ESCOLAR" = :year)
AND (:subjectId IS NULL OR a."ID" = :subjectId);

-- ------------------------------------------------------------
-- METRICAS DEL RESUMEN
-- Regla de avance semestre:
-- clases publicadas / clases planificadas del semestre * 100
-- ------------------------------------------------------------
WITH current_user AS (
    SELECT
        u."PERSONA_ID" AS persona_id,
        COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
    FROM "USUARIOS" u
    LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
    LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
    WHERE u."USUARIO" = :username
),
unit_row AS (
    SELECT
        up."ID" AS id,
        COALESCE(up."CLASES_PLANIFICADAS", 0) AS planned_classes,
        COUNT(DISTINCT cp."ID") AS total_classes,
        COUNT(DISTINCT CASE WHEN cp."ESTADO" = 'PUBLICADA' THEN cp."ID" END) AS published_classes,
        COUNT(DISTINCT pd."ID") AS total_documents,
        COUNT(DISTINCT CASE WHEN pd."VISIBLE_ALUMNOS" = TRUE THEN pd."ID" END) AS visible_documents
    FROM current_user cu
    JOIN "UNIDADES_PLANIFICACION" up ON 1 = 1
    JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
    JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
    JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
    LEFT JOIN "CLASES_PLANIFICACION" cp ON cp."UNIDAD_ID" = up."ID"
    LEFT JOIN "CLASES_PLANIFICACION_DOCUMENTOS" pd
        ON pd."UNIDAD_ID" = up."ID"
       AND COALESCE(pd."ELIMINADO", FALSE) = FALSE
       AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
    WHERE (
        cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')
        OR pr."PERSONA_ID" = cu.persona_id
    )
    AND (:year IS NULL OR cd."ANIO_ESCOLAR" = :year)
    AND (:subjectId IS NULL OR a."ID" = :subjectId)
    GROUP BY up."ID", up."CLASES_PLANIFICADAS"
)
SELECT
    COUNT(*) AS total_units,
    COALESCE(SUM(unit_row.total_classes), 0) AS total_classes,
    COALESCE(SUM(unit_row.published_classes), 0) AS published_classes,
    COALESCE(SUM(unit_row.total_documents), 0) AS total_documents,
    COALESCE(SUM(unit_row.visible_documents), 0) AS visible_documents,
    CASE
        WHEN COALESCE(SUM(unit_row.planned_classes), 0) <= 0 THEN
            CASE WHEN COALESCE(SUM(unit_row.published_classes), 0) > 0 THEN 100 ELSE 0 END
        ELSE LEAST(
            100,
            ROUND(
                (
                    COALESCE(SUM(unit_row.published_classes), 0)::numeric
                    / NULLIF(SUM(unit_row.planned_classes), 0)::numeric
                ) * 100
            )::int
        )
    END AS semester_progress
FROM unit_row;

-- ------------------------------------------------------------
-- FILTROS DE ASIGNATURAS
-- ------------------------------------------------------------
WITH current_user AS (
    SELECT
        u."PERSONA_ID" AS persona_id,
        COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
    FROM "USUARIOS" u
    LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
    LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
    WHERE u."USUARIO" = :username
)
SELECT DISTINCT
    a."ID" AS subject_id,
    a."NOMBRE" AS subject_name
FROM current_user cu
JOIN "UNIDADES_PLANIFICACION" up ON 1 = 1
JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
WHERE (
    cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')
    OR pr."PERSONA_ID" = cu.persona_id
)
AND (:year IS NULL OR cd."ANIO_ESCOLAR" = :year)
ORDER BY a."NOMBRE";

-- ------------------------------------------------------------
-- LISTADO DE UNIDADES DEL SEMESTRE
-- Regla de avance por unidad:
-- clases publicadas / clases planificadas * 100
-- Estado:
-- 0% = PENDIENTE
-- 1-99% = ACTIVA
-- 100% = COMPLETADA
-- ------------------------------------------------------------
WITH current_user AS (
    SELECT
        u."PERSONA_ID" AS persona_id,
        COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
    FROM "USUARIOS" u
    LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
    LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
    WHERE u."USUARIO" = :username
)
SELECT
    up."ID" AS unit_id,
    up."NUMERO_UNIDAD" AS unit_code,
    up."NOMBRE" AS unit_name,
    a."ID" AS subject_id,
    a."NOMBRE" AS subject_name,
    c."NOMBRE" AS course_name,
    up."SEMANA_INICIO" AS start_week,
    up."SEMANAS_ESTIMADAS" AS estimated_weeks,
    COALESCE(up."CLASES_PLANIFICADAS", 0) AS planned_classes,
    COUNT(DISTINCT cp."ID") AS total_classes,
    COUNT(DISTINCT CASE WHEN cp."ESTADO" = 'PUBLICADA' THEN cp."ID" END) AS published_classes,
    COUNT(DISTINCT pd."ID") AS total_documents,
    CASE
        WHEN COALESCE(up."CLASES_PLANIFICADAS", 0) <= 0 THEN
            CASE WHEN COUNT(DISTINCT CASE WHEN cp."ESTADO" = 'PUBLICADA' THEN cp."ID" END) > 0 THEN 100 ELSE 0 END
        ELSE LEAST(
            100,
            ROUND(
                (
                    COUNT(DISTINCT CASE WHEN cp."ESTADO" = 'PUBLICADA' THEN cp."ID" END)::numeric
                    / NULLIF(up."CLASES_PLANIFICADAS", 0)::numeric
                ) * 100
            )::int
        )
    END AS progress_percent
FROM current_user cu
JOIN "UNIDADES_PLANIFICACION" up ON 1 = 1
JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
LEFT JOIN "CLASES_PLANIFICACION" cp ON cp."UNIDAD_ID" = up."ID"
LEFT JOIN "CLASES_PLANIFICACION_DOCUMENTOS" pd
    ON pd."UNIDAD_ID" = up."ID"
   AND COALESCE(pd."ELIMINADO", FALSE) = FALSE
   AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
WHERE (
    cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')
    OR pr."PERSONA_ID" = cu.persona_id
)
AND (:year IS NULL OR cd."ANIO_ESCOLAR" = :year)
AND (:subjectId IS NULL OR a."ID" = :subjectId)
GROUP BY
    up."ID",
    up."NUMERO_UNIDAD",
    up."NOMBRE",
    a."ID",
    a."NOMBRE",
    c."NOMBRE",
    up."SEMANA_INICIO",
    up."SEMANAS_ESTIMADAS",
    up."CLASES_PLANIFICADAS"
ORDER BY up."FECHA_INICIO" DESC, up."ID" DESC;
