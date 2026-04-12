CREATE TABLE IF NOT EXISTS "PERIODOS_ACADEMICOS" (
  "ID" BIGSERIAL PRIMARY KEY,
  "NOMBRE" VARCHAR(120) NOT NULL,
  "ANIO" INTEGER NOT NULL,
  "SEMESTRE" INTEGER NOT NULL,
  "FECHA_INICIO" DATE NOT NULL,
  "FECHA_FIN" DATE NOT NULL,
  "ACTIVO" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "CURSO_ASIGNATURAS" (
  "ID" BIGSERIAL PRIMARY KEY,
  "CURSO_ID" BIGINT NOT NULL REFERENCES "CURSOS" ("ID"),
  "ASIGNATURA_ID" BIGINT NOT NULL REFERENCES "ASIGNATURAS" ("ID"),
  "ACTIVA" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "UQ_CURSO_ASIGNATURAS" UNIQUE ("CURSO_ID", "ASIGNATURA_ID")
);

CREATE TABLE IF NOT EXISTS "EVALUACIONES" (
  "ID" BIGSERIAL PRIMARY KEY,
  "CURSO_ID" BIGINT NOT NULL REFERENCES "CURSOS" ("ID"),
  "ASIGNATURA_ID" BIGINT NOT NULL REFERENCES "ASIGNATURAS" ("ID"),
  "PERIODO_ID" BIGINT NOT NULL REFERENCES "PERIODOS_ACADEMICOS" ("ID"),
  "CODIGO" VARCHAR(20) NOT NULL,
  "NOMBRE" VARCHAR(120) NOT NULL,
  "ORDEN" INTEGER NOT NULL,
  "PONDERACION" NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  "ACTIVA" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "CALIFICACIONES" (
  "ID" BIGSERIAL PRIMARY KEY,
  "EVALUACION_ID" BIGINT NOT NULL REFERENCES "EVALUACIONES" ("ID") ON DELETE CASCADE,
  "ALUMNO_ID" BIGINT NOT NULL REFERENCES "ALUMNOS" ("ID"),
  "NOTA" NUMERIC(3,1),
  "OBSERVACION" VARCHAR(255),
  "ACTIVA" BOOLEAN NOT NULL DEFAULT TRUE,
  "CREADO_EN" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ACTUALIZADO_EN" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UQ_CALIFICACION_EVALUACION_ALUMNO" UNIQUE ("EVALUACION_ID", "ALUMNO_ID")
);

INSERT INTO "PERIODOS_ACADEMICOS" ("NOMBRE", "ANIO", "SEMESTRE", "FECHA_INICIO", "FECHA_FIN", "ACTIVO")
SELECT * FROM (
  VALUES
    ('1er Semestre 2026', 2026, 1, DATE '2026-03-01', DATE '2026-07-15', TRUE),
    ('2do Semestre 2026', 2026, 2, DATE '2026-07-16', DATE '2026-12-20', TRUE)
) AS source("NOMBRE", "ANIO", "SEMESTRE", "FECHA_INICIO", "FECHA_FIN", "ACTIVO")
WHERE NOT EXISTS (
  SELECT 1
  FROM "PERIODOS_ACADEMICOS" target
  WHERE target."ANIO" = source."ANIO"
    AND target."SEMESTRE" = source."SEMESTRE"
);

WITH course_subject_pairs AS (
  SELECT c."ID" AS curso_id, s."ID" AS asignatura_id
  FROM "CURSOS" c
  JOIN "ASIGNATURAS" s ON s."ACTIVA" = TRUE
  WHERE c."NOMBRE" = '3° y 4°'
    AND s."NOMBRE" IN ('Matemática', 'Lenguaje', 'Historia', 'Ciencias', 'Inglés', 'Artes', 'Educación Física')
  UNION ALL
  SELECT c."ID", s."ID"
  FROM "CURSOS" c
  JOIN "ASIGNATURAS" s ON s."ACTIVA" = TRUE
  WHERE c."NOMBRE" = '5° y 6°'
    AND s."NOMBRE" IN ('Matemática', 'Lenguaje', 'Historia', 'Ciencias', 'Inglés', 'Artes')
  UNION ALL
  SELECT c."ID", s."ID"
  FROM "CURSOS" c
  JOIN "ASIGNATURAS" s ON s."ACTIVA" = TRUE
  WHERE c."NOMBRE" = 'PK - Kinder - 1°'
    AND s."NOMBRE" IN ('Matemática', 'Lenguaje', 'Ciencias', 'Artes', 'Convivencia')
)
INSERT INTO "CURSO_ASIGNATURAS" ("CURSO_ID", "ASIGNATURA_ID", "ACTIVA")
SELECT DISTINCT curso_id, asignatura_id, TRUE
FROM course_subject_pairs pair
ON CONFLICT ("CURSO_ID", "ASIGNATURA_ID")
DO UPDATE SET "ACTIVA" = EXCLUDED."ACTIVA";

DELETE FROM "CALIFICACIONES"
WHERE "EVALUACION_ID" IN (
  SELECT e."ID"
  FROM "EVALUACIONES" e
  JOIN "PERIODOS_ACADEMICOS" p ON p."ID" = e."PERIODO_ID"
  WHERE p."ANIO" = 2026
    AND p."SEMESTRE" = 1
);

DELETE FROM "EVALUACIONES"
WHERE "PERIODO_ID" IN (
  SELECT "ID"
  FROM "PERIODOS_ACADEMICOS"
  WHERE "ANIO" = 2026
    AND "SEMESTRE" = 1
);

WITH periodo AS (
  SELECT "ID" AS periodo_id
  FROM "PERIODOS_ACADEMICOS"
  WHERE "ANIO" = 2026
    AND "SEMESTRE" = 1
  LIMIT 1
),
base AS (
  SELECT ca."CURSO_ID", ca."ASIGNATURA_ID", p.periodo_id
  FROM "CURSO_ASIGNATURAS" ca
  CROSS JOIN periodo p
  WHERE ca."ACTIVA" = TRUE
),
evaluaciones_seed AS (
  SELECT "CURSO_ID", "ASIGNATURA_ID", periodo_id, 'N1' AS codigo, 'Nota 1' AS nombre, 1 AS orden, 20.00 AS ponderacion FROM base
  UNION ALL
  SELECT "CURSO_ID", "ASIGNATURA_ID", periodo_id, 'N2', 'Nota 2', 2, 20.00 FROM base
  UNION ALL
  SELECT "CURSO_ID", "ASIGNATURA_ID", periodo_id, 'N3', 'Nota 3', 3, 20.00 FROM base
  UNION ALL
  SELECT "CURSO_ID", "ASIGNATURA_ID", periodo_id, 'N4', 'Nota 4', 4, 20.00 FROM base
  UNION ALL
  SELECT "CURSO_ID", "ASIGNATURA_ID", periodo_id, 'N5', 'Nota 5', 5, 20.00 FROM base
)
INSERT INTO "EVALUACIONES" (
  "CURSO_ID",
  "ASIGNATURA_ID",
  "PERIODO_ID",
  "CODIGO",
  "NOMBRE",
  "ORDEN",
  "PONDERACION",
  "ACTIVA"
)
SELECT
  "CURSO_ID",
  "ASIGNATURA_ID",
  periodo_id,
  codigo,
  nombre,
  orden,
  ponderacion,
  TRUE
FROM evaluaciones_seed;

WITH notas_seed AS (
  SELECT * FROM (
    VALUES
      (9, 16, 2, ARRAY[6.4, 6.1, 6.8, 6.2, 6.9]::numeric[]),
      (9, 16, 3, ARRAY[6.7, 6.8, 6.4, 6.9, 6.6]::numeric[]),
      (9, 16, 4, ARRAY[NULL, NULL, NULL, NULL, NULL]::numeric[]),
      (9, 16, 1, ARRAY[7.0, 6.8, 7.0, 6.9, 7.0]::numeric[]),
      (9, 16, 11, ARRAY[5.8, 5.9, 6.0, 5.7, 6.1]::numeric[]),
      (9, 16, 13, ARRAY[6.0, 6.3, 6.2, 6.1, 6.4]::numeric[]),
      (9, 16, 9, ARRAY[6.5, 6.6, 6.8, 6.7, 6.9]::numeric[]),

      (9, 17, 2, ARRAY[4.1, 4.5, 4.2, 4.0, 4.2]::numeric[]),
      (9, 17, 3, ARRAY[3.8, 3.9, 4.0, 3.7, 3.8]::numeric[]),
      (9, 17, 4, ARRAY[4.5, 4.4, 4.3, 4.6, 4.7]::numeric[]),
      (9, 17, 1, ARRAY[4.7, 4.9, 4.8, 5.0, 5.1]::numeric[]),
      (9, 17, 11, ARRAY[3.9, 4.0, 3.8, 4.1, 4.0]::numeric[]),
      (9, 17, 13, ARRAY[5.0, 4.8, 5.2, 5.1, 4.9]::numeric[]),
      (9, 17, 9, ARRAY[4.8, 4.9, 5.1, 5.0, 5.2]::numeric[]),

      (8, 19, 2, ARRAY[6.0, 6.2, 6.1, 6.3, 6.4]::numeric[]),
      (8, 19, 3, ARRAY[5.9, 6.1, 6.0, 6.2, 6.3]::numeric[]),
      (8, 19, 1, ARRAY[6.1, 6.0, 6.2, 6.3, 6.2]::numeric[]),
      (8, 19, 13, ARRAY[6.5, 6.7, 6.8, 6.6, 6.9]::numeric[]),
      (8, 19, 12, ARRAY[6.8, 6.9, 7.0, 6.8, 6.9]::numeric[]),

      (8, 15, 2, ARRAY[5.4, 5.5, 5.7, 5.6, 5.5]::numeric[]),
      (8, 15, 3, ARRAY[5.3, 5.4, 5.5, 5.6, 5.7]::numeric[]),
      (8, 15, 1, ARRAY[5.8, 5.6, 5.7, 5.9, 5.8]::numeric[]),
      (8, 15, 13, ARRAY[6.2, 6.1, 6.3, 6.4, 6.2]::numeric[]),
      (8, 15, 12, ARRAY[6.0, 6.1, 6.2, 6.3, 6.1]::numeric[]),

      (10, 14, 2, ARRAY[5.6, 5.7, 5.9, 5.8, 6.0]::numeric[]),
      (10, 14, 3, ARRAY[5.2, 5.4, 5.5, 5.3, 5.6]::numeric[]),
      (10, 14, 4, ARRAY[5.8, 5.9, 5.7, 6.0, 5.9]::numeric[]),
      (10, 14, 1, ARRAY[6.3, 6.1, 6.2, 6.4, 6.5]::numeric[]),
      (10, 14, 11, ARRAY[4.9, 5.0, 5.1, 4.8, 5.2]::numeric[]),
      (10, 14, 13, ARRAY[6.4, 6.5, 6.6, 6.4, 6.7]::numeric[])
  ) AS t(curso_id, alumno_id, asignatura_id, notas)
),
relaciones AS (
  SELECT
    ns.notas,
    ns.curso_id,
    ns.alumno_id,
    ns.asignatura_id
  FROM notas_seed ns
),
evaluaciones AS (
  SELECT
    r.alumno_id,
    e."ID" AS evaluacion_id,
    e."ORDEN",
    r.notas
  FROM relaciones r
  JOIN "EVALUACIONES" e
    ON e."CURSO_ID" = r.curso_id
   AND e."ASIGNATURA_ID" = r.asignatura_id
   AND e."ORDEN" BETWEEN 1 AND 5
),
notas_expandida AS (
  SELECT
    alumno_id,
    evaluacion_id,
    notas["ORDEN"] AS nota
  FROM evaluaciones
)
INSERT INTO "CALIFICACIONES" (
  "EVALUACION_ID",
  "ALUMNO_ID",
  "NOTA",
  "OBSERVACION",
  "ACTIVA",
  "CREADO_EN",
  "ACTUALIZADO_EN"
)
SELECT
  evaluacion_id,
  alumno_id,
  nota,
  CASE WHEN nota IS NULL THEN 'Pendiente de registrar' ELSE NULL END,
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM notas_expandida;
