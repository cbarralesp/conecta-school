SELECT conname, conrelid::regclass AS table_name, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass::text IN ('"PROFESOR_ASIGNATURAS"','"CURSO_DOCENTES"')
ORDER BY conrelid::regclass::text, conname;
