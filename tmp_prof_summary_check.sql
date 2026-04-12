SELECT p."ID", pe."NOMBRES" || ' ' || pe."APELLIDOS" AS profesor,
       COUNT(DISTINCT pa."ASIGNATURA_ID") AS asignaturas_rel,
       COUNT(DISTINCT cd."CURSO_ID") AS cursos_rel,
       COUNT(DISTINCT hc."ID") AS bloques_horario
FROM public."PROFESORES" p
JOIN public."PERSONAS" pe ON pe."ID" = p."PERSONA_ID"
LEFT JOIN public."PROFESOR_ASIGNATURAS" pa ON pa."PROFESOR_ID" = p."ID" AND pa."ACTIVO" = TRUE
LEFT JOIN public."CARGAS_DOCENTES" cd ON cd."PROFESOR_ID" = p."ID" AND cd."ACTIVA" = TRUE
LEFT JOIN public."HORARIOS_CARGAS" hc ON hc."CARGA_DOCENTE_ID" = cd."ID"
GROUP BY p."ID", pe."NOMBRES", pe."APELLIDOS"
ORDER BY profesor;
