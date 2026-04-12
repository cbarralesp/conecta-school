SELECT pa."PROFESOR_ID",
       pe."NOMBRES" || ' ' || pe."APELLIDOS" AS profesor,
       pa."ASIGNATURA",
       pa."ASIGNATURA_ID",
       a."NOMBRE" AS asignatura_catalogo
FROM public."PROFESOR_ASIGNATURAS" pa
JOIN public."PROFESORES" pr ON pr."ID" = pa."PROFESOR_ID"
JOIN public."PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
LEFT JOIN public."ASIGNATURAS" a ON a."ID" = pa."ASIGNATURA_ID"
WHERE pa."ACTIVO" = TRUE
ORDER BY profesor, pa."ASIGNATURA";
