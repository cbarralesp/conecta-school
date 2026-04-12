BEGIN;

UPDATE "CURSOS"
SET "CODIGO" = regexp_replace("CODIGO", '^CUR-', '', 'i')
WHERE "ACTIVO" = TRUE
  AND "CODIGO" ~* '^CUR-[A-Z0-9]+-[0-9]{4}$';

COMMIT;
