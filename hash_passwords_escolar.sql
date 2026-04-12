CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "USUARIOS"
SET "CLAVE" = CASE
    WHEN "USUARIO" = 'jperez' THEN crypt('jperez123', gen_salt('bf', 12))
    WHEN "USUARIO" = 'mgonzalez' THEN crypt('mgonzalez123', gen_salt('bf', 12))
    ELSE "CLAVE"
END
WHERE "USUARIO" IN ('jperez', 'mgonzalez');
