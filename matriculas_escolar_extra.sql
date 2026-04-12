INSERT INTO "ALUMNOS" ("RUN", "NOMBRE", "APELLIDOS", "DIRECCION", "FECHA_NACIMIENTO", "GENERO", "NECESIDADES_ESPECIALES", "ACTIVO")
SELECT v."RUN", v."NOMBRE", v."APELLIDOS", v."DIRECCION", v."FECHA_NACIMIENTO", v."GENERO", v."NECESIDADES_ESPECIALES", TRUE
FROM (
    VALUES
        ('26.890.123-4', 'Mateo', 'Herrera Castillo', 'Poblacion Nueva 88, San Ramon', DATE '2018-05-14', 'Masculino', 'Ninguna'),
        ('27.901.234-5', 'Florencia', 'Vega Contreras', 'Pasaje El Sol 41, La Cisterna', DATE '2015-10-02', 'Femenino', 'Refuerzo lector')
) AS v("RUN", "NOMBRE", "APELLIDOS", "DIRECCION", "FECHA_NACIMIENTO", "GENERO", "NECESIDADES_ESPECIALES")
WHERE NOT EXISTS (
    SELECT 1
    FROM "ALUMNOS" a
    WHERE a."RUN" = v."RUN"
);

UPDATE "ALUMNOS" a
SET
    "NOMBRE" = v."NOMBRE",
    "APELLIDOS" = v."APELLIDOS",
    "DIRECCION" = v."DIRECCION",
    "FECHA_NACIMIENTO" = v."FECHA_NACIMIENTO",
    "GENERO" = v."GENERO",
    "NECESIDADES_ESPECIALES" = v."NECESIDADES_ESPECIALES",
    "ACTIVO" = TRUE
FROM (
    VALUES
        ('26.890.123-4', 'Mateo', 'Herrera Castillo', 'Poblacion Nueva 88, San Ramon', DATE '2018-05-14', 'Masculino', 'Ninguna'),
        ('27.901.234-5', 'Florencia', 'Vega Contreras', 'Pasaje El Sol 41, La Cisterna', DATE '2015-10-02', 'Femenino', 'Refuerzo lector')
) AS v("RUN", "NOMBRE", "APELLIDOS", "DIRECCION", "FECHA_NACIMIENTO", "GENERO", "NECESIDADES_ESPECIALES")
WHERE a."RUN" = v."RUN";

DELETE FROM "MATRICULA_RETIRO_RESPONSABLES"
WHERE "MATRICULA_ID" IN (
    SELECT m."ID"
    FROM "MATRICULAS" m
    JOIN "ALUMNOS" a ON a."ID" = m."ALUMNO_ID"
    WHERE a."RUN" IN ('26.890.123-4', '27.901.234-5')
);

DELETE FROM "MATRICULA_APODERADOS"
WHERE "MATRICULA_ID" IN (
    SELECT m."ID"
    FROM "MATRICULAS" m
    JOIN "ALUMNOS" a ON a."ID" = m."ALUMNO_ID"
    WHERE a."RUN" IN ('26.890.123-4', '27.901.234-5')
);

DELETE FROM "MATRICULAS"
WHERE "ALUMNO_ID" IN (
    SELECT "ID"
    FROM "ALUMNOS"
    WHERE "RUN" IN ('26.890.123-4', '27.901.234-5')
);

WITH alumnos_base AS (
    SELECT "ID", "RUN"
    FROM "ALUMNOS"
    WHERE "RUN" IN ('26.890.123-4', '27.901.234-5')
),
cursos_base AS (
    SELECT "ID", "NOMBRE"
    FROM "CURSOS"
    WHERE "ACTIVO" = TRUE
      AND "NOMBRE" IN ('PK - Kinder - 1°', '6 Basico A')
)
INSERT INTO "MATRICULAS" ("ALUMNO_ID", "CURSO_ID", "ESTADO", "FECHA_MATRICULA", "ACTIVA", "OBSERVACIONES")
SELECT
    a."ID",
    c."ID",
    s."ESTADO",
    s."FECHA_MATRICULA",
    TRUE,
    s."OBSERVACIONES"
FROM (
    VALUES
        ('26.890.123-4', 'PK - Kinder - 1°', 'ACTIVO', DATE '2026-01-19', 'Ingreso regular'),
        ('27.901.234-5', '6 Basico A', 'PENDIENTE', DATE '2026-02-01', 'Pendiente entrega de certificado')
) AS s("RUN", "CURSO", "ESTADO", "FECHA_MATRICULA", "OBSERVACIONES")
JOIN alumnos_base a ON a."RUN" = s."RUN"
JOIN cursos_base c ON c."NOMBRE" = s."CURSO";

INSERT INTO "MATRICULA_APODERADOS" (
    "MATRICULA_ID", "RUN", "NOMBRE", "APELLIDOS", "TELEFONO", "EMAIL", "RELACION", "AUTORIZADO_RETIRO", "ACTIVO"
)
SELECT m."ID", s."RUN_APODERADO", s."NOMBRE", s."APELLIDOS", s."TELEFONO", s."EMAIL", s."RELACION", s."AUTORIZADO", TRUE
FROM (
    VALUES
        ('26.890.123-4', '15.789.654-3', 'Carolina', 'Castillo Rivas', '+56 9 7321 0045', 'carolina.castillo@email.com', 'Madre', TRUE),
        ('27.901.234-5', '16.901.456-7', 'Daniela', 'Contreras Pinto', '+56 9 8456 1034', 'daniela.contreras@email.com', 'Madre', TRUE)
) AS s("RUN_ALUMNO", "RUN_APODERADO", "NOMBRE", "APELLIDOS", "TELEFONO", "EMAIL", "RELACION", "AUTORIZADO")
JOIN "ALUMNOS" a ON a."RUN" = s."RUN_ALUMNO"
JOIN "MATRICULAS" m ON m."ALUMNO_ID" = a."ID" AND m."ACTIVA" = TRUE;

INSERT INTO "MATRICULA_RETIRO_RESPONSABLES" (
    "MATRICULA_ID", "RUN", "NOMBRE", "APELLIDOS", "TELEFONO", "RELACION", "AUTORIZADO_RETIRO", "ACTIVO"
)
SELECT m."ID", s."RUN", s."NOMBRE", s."APELLIDOS", s."TELEFONO", s."RELACION", s."AUTORIZADO", TRUE
FROM (
    VALUES
        ('26.890.123-4', '20.345.888-2', 'Ignacio', 'Herrera Castillo', '+56 9 9111 4567', 'Padre', TRUE),
        ('26.890.123-4', '18.567.123-9', 'Patricia', 'Rivas Salinas', '+56 9 8777 6677', 'Abuela', TRUE),
        ('27.901.234-5', '17.989.112-3', 'Rosa', 'Pinto Gallardo', '+56 9 7444 2233', 'Abuela', TRUE)
) AS s("RUN_ALUMNO", "RUN", "NOMBRE", "APELLIDOS", "TELEFONO", "RELACION", "AUTORIZADO")
JOIN "ALUMNOS" a ON a."RUN" = s."RUN_ALUMNO"
JOIN "MATRICULAS" m ON m."ALUMNO_ID" = a."ID" AND m."ACTIVA" = TRUE;
