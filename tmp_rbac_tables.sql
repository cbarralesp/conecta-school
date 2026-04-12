SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name ILIKE '%alumn%' OR table_name ILIKE '%matric%' OR table_name ILIKE '%usuario%' OR table_name ILIKE '%person%' OR table_name ILIKE '%curso%' OR table_name ILIKE '%asist%' OR table_name ILIKE '%calif%')
ORDER BY table_name;
