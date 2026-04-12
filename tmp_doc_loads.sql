SELECT cd."ID",
       cd."PROFESOR_ID",
       pe."NOMBRES" || ' ' || pe."APELLIDOS" AS profesor,
       cd."CURSO_ID",
       c."NOMBRE" AS curso,
       cd."ASIGNATURA_ID",
       a."NOMBRE" AS asignatura,
       cd."HORAS_SEMANALES",
       cd."ES_PROFESOR_JEFE",
       cd."ACTIVA"
FROM public."CARGAS_DOCENTES" cd
JOIN public."PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
JOIN public."PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
JOIN public."CURSOS" c ON c."ID" = cd."CURSO_ID"
JOIN public."ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
ORDER BY profesor, curso, asignatura;
