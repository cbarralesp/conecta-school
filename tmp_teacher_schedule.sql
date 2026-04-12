SELECT hc."ID",
       cd."PROFESOR_ID",
       pe."NOMBRES" || ' ' || pe."APELLIDOS" AS profesor,
       c."NOMBRE" AS curso,
       a."NOMBRE" AS asignatura,
       bh."DIA_SEMANA",
       bh."HORA_INICIO",
       bh."HORA_FIN",
       hc."SALA"
FROM public."HORARIOS_CARGAS" hc
JOIN public."CARGAS_DOCENTES" cd ON cd."ID" = hc."CARGA_DOCENTE_ID"
JOIN public."PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
JOIN public."PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
JOIN public."CURSOS" c ON c."ID" = cd."CURSO_ID"
JOIN public."ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
JOIN public."BLOQUES_HORARIOS" bh ON bh."ID" = hc."BLOQUE_HORARIO_ID"
ORDER BY profesor,
         CASE bh."DIA_SEMANA" WHEN 'LUNES' THEN 1 WHEN 'MARTES' THEN 2 WHEN 'MIERCOLES' THEN 3 WHEN 'JUEVES' THEN 4 WHEN 'VIERNES' THEN 5 ELSE 6 END,
         bh."HORA_INICIO";
