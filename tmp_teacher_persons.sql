SELECT p."ID" AS profesor_id,
       p."CODIGO",
       pe."RUN",
       pe."NOMBRES" || ' ' || pe."APELLIDOS" AS profesor,
       p."TITULO_PROFESIONAL",
       p."TIPO_CONTRATO",
       p."HORAS_SEMANALES",
       p."ESTADO_DOCENTE",
       p."ACTIVO"
FROM public."PROFESORES" p
JOIN public."PERSONAS" pe ON pe."ID" = p."PERSONA_ID"
ORDER BY p."ID";
