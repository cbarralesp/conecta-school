SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('CURSOS_MAESTROS', 'PROFESORES_CATALOGO', 'ASIGNATURAS', 'CURSOS', 'PERSONAS', 'PROFESORES')
ORDER BY table_name, ordinal_position;

SELECT pe."ID", pe."RUN", pe."NOMBRES", pe."APELLIDOS", pe."CORREO_ELECTRONICO", pr."ID" AS profesor_id
FROM "PROFESORES" pr
JOIN "PERSONAS" pe ON pe."ID" = pr."PERSONA_ID"
ORDER BY pe."NOMBRES", pe."APELLIDOS";
