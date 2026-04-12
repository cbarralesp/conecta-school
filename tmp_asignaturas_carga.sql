SELECT pe."NOMBRES" || ' ' || pe."APELLIDOS" AS profesor,
       string_agg(DISTINCT a."NOMBRE", ', ' ORDER BY a."NOMBRE") AS asignaturas_carga
FROM "PROFESORES" p
JOIN "PERSONAS" pe ON pe."ID" = p."PERSONA_ID"
JOIN "CARGAS_DOCENTES" cd ON cd."PROFESOR_ID" = p."ID" AND cd."ACTIVA" = TRUE
JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
GROUP BY pe."NOMBRES", pe."APELLIDOS"
ORDER BY profesor;
