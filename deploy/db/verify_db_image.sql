SELECT COUNT(*) AS table_count
FROM pg_tables
WHERE schemaname = 'public';

SELECT COUNT(*) AS region_count
FROM public."CHILE_REGIONES";

SELECT COUNT(*) AS commune_count
FROM public."CHILE_COMUNAS";
