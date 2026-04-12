SELECT p."ID", pe."NOMBRES" || ' ' || pe."APELLIDOS" AS profesor, pce."ID" AS contacto_id, pce."NOMBRE_COMPLETO", pce."RELACION", pce."TELEFONO"
FROM "PROFESORES" p
JOIN "PERSONAS" pe ON pe."ID" = p."PERSONA_ID"
LEFT JOIN "PROFESOR_CONTACTOS_EMERGENCIA" pce ON pce."PROFESOR_ID" = p."ID" AND COALESCE(pce."ACTIVO", TRUE) = TRUE
ORDER BY profesor, p."ID", contacto_id;
