SELECT cd."ID", cd."CURSO_ID", c."NOMBRE" AS curso,
       cd."PROFESOR_ID", pc1."NOMBRE" || ' ' || pc1."APELLIDO" AS profesor_catalogo,
       cd."ASISTENTE_ID", pc2."NOMBRE" || ' ' || pc2."APELLIDO" AS asistente_catalogo
FROM public."CURSO_DOCENTES" cd
JOIN public."CURSOS" c ON c."ID" = cd."CURSO_ID"
LEFT JOIN public."PROFESORES_CATALOGO" pc1 ON pc1."ID" = cd."PROFESOR_ID"
LEFT JOIN public."PROFESORES_CATALOGO" pc2 ON pc2."ID" = cd."ASISTENTE_ID"
ORDER BY c."NOMBRE";
