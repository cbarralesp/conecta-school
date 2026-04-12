SELECT pc."ID" AS catalogo_id,
       pc."NOMBRE" || ' ' || pc."APELLIDO" AS catalogo_nombre,
       p."ID" AS profesor_id,
       pe."NOMBRES" || ' ' || pe."APELLIDOS" AS profesor_nombre
FROM public."PROFESORES_CATALOGO" pc
FULL OUTER JOIN public."PROFESORES" p ON p."ID" = pc."ID"
FULL OUTER JOIN public."PERSONAS" pe ON pe."ID" = p."PERSONA_ID"
ORDER BY COALESCE(pc."ID", p."ID");
