CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "PERSONAS"
SET "NOMBRES" = 'Nicole',
    "APELLIDOS" = 'Ramirez'
WHERE "ID" = (
  SELECT "PERSONA_ID"
  FROM "USUARIOS"
  WHERE "USUARIO" = 'jperez'
);

UPDATE "USUARIOS"
SET "USUARIO" = 'nramirez',
    "CLAVE" = crypt('nramirez123', gen_salt('bf', 10))
WHERE "USUARIO" = 'jperez';

SELECT u."ID",
       u."USUARIO",
       p."NOMBRES",
       p."APELLIDOS"
FROM "USUARIOS" u
JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
WHERE u."USUARIO" = 'nramirez';
