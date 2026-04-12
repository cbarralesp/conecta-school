SELECT pe."NOMBRES" || ' ' || pe."APELLIDOS" AS profesor, p."ID" AS profesor_id,
       COUNT(DISTINCT cd."ID") AS cargas,
       COUNT(DISTINCT hc."ID") AS bloques,
       COUNT(DISTINCT pa."ASIGNATURA_ID") AS asignaturas,
       COUNT(DISTINCT pce."ID") AS contactos,
       COUNT(DISTINCT curd."CURSO_ID") AS curso_docente_refs,
       COUNT(DISTINCT CASE WHEN curd."ASISTENTE_ID" = p."ID" THEN curd."CURSO_ID" END) AS curso_asistente_refs
FROM "PROFESORES" p
JOIN "PERSONAS" pe ON pe."ID" = p."PERSONA_ID"
LEFT JOIN "CARGAS_DOCENTES" cd ON cd."PROFESOR_ID" = p."ID"
LEFT JOIN "HORARIOS_CARGAS" hc ON hc."CARGA_DOCENTE_ID" = cd."ID"
LEFT JOIN "PROFESOR_ASIGNATURAS" pa ON pa."PROFESOR_ID" = p."ID"
LEFT JOIN "PROFESOR_CONTACTOS_EMERGENCIA" pce ON pce."PROFESOR_ID" = p."ID"
LEFT JOIN "CURSO_DOCENTES" curd ON curd."PROFESOR_ID" = p."ID" OR curd."ASISTENTE_ID" = p."ID"
GROUP BY pe."NOMBRES", pe."APELLIDOS", p."ID"
ORDER BY profesor, p."ID";
