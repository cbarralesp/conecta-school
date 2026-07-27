-- Ejecutar manualmente una vez por ambiente. No requiere Flyway y es idempotente.
-- CONCURRENTLY evita bloquear escrituras mientras PostgreSQL construye los indices.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planning_classes_unit_date_active
    ON public."CLASES_PLANIFICACION" ("UNIDAD_ID", "FECHA_PLANIFICADA" DESC, "ID" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planning_documents_class_active_date
    ON public."CLASES_PLANIFICACION_DOCUMENTOS" ("CLASE_ID", "FECHA_CARGA" DESC, "ID" DESC)
    WHERE COALESCE("ELIMINADO", FALSE) = FALSE
      AND COALESCE("ESTADO", 'ACTIVO') = 'ACTIVO';

ANALYZE public."CLASES_PLANIFICACION";
ANALYZE public."CLASES_PLANIFICACION_DOCUMENTOS";
