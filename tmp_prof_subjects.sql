SELECT pr."ID" AS profesor_id,
       pe."NOMBRES" || ' ' || pe."APELLIDOS" AS profesor,
       pa."ASIGNATURA",
       a."ID" AS asignatura_id_match,
       a."NOMBRE" AS asignatura_catalogo
FROM public."PROFESOR_ASIGNATURAS" pa
JOIN public."PROFESORES" pr ON pr."ID" = pa."PROFESOR_ID"
JOIN public."PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
LEFT JOIN public."ASIGNATURAS" a ON UPPER(TRIM(a."NOMBRE")) = UPPER(TRIM(pa."ASIGNATURA"))
WHERE pa."ACTIVO" = TRUE
ORDER BY profesor, pa."ASIGNATURA";
