UPDATE "MATRICULA_DOCUMENTOS" old_docs
SET "DOCUMENTO_CLAVE" = 'image-consent'
WHERE old_docs."DOCUMENTO_CLAVE" = 'image-permission'
  AND NOT EXISTS (
      SELECT 1
      FROM "MATRICULA_DOCUMENTOS" new_docs
      WHERE new_docs."MATRICULA_ID" = old_docs."MATRICULA_ID"
        AND new_docs."DOCUMENTO_CLAVE" = 'image-consent'
  );

WITH legacy_other_candidate AS (
    SELECT MIN(old_docs."ID") AS "ID"
    FROM "MATRICULA_DOCUMENTOS" old_docs
    WHERE old_docs."DOCUMENTO_CLAVE" IN ('junaeb-sep', 'migratory-docs', 'priority-certificate')
      AND NOT EXISTS (
          SELECT 1
          FROM "MATRICULA_DOCUMENTOS" new_docs
          WHERE new_docs."MATRICULA_ID" = old_docs."MATRICULA_ID"
            AND new_docs."DOCUMENTO_CLAVE" = 'other'
      )
    GROUP BY old_docs."MATRICULA_ID"
)
UPDATE "MATRICULA_DOCUMENTOS" old_docs
SET "DOCUMENTO_CLAVE" = 'other'
FROM legacy_other_candidate candidate
WHERE old_docs."ID" = candidate."ID";
