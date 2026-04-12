ALTER TABLE "ALUMNOS"
    ADD COLUMN IF NOT EXISTS "GENERO" VARCHAR(30),
    ADD COLUMN IF NOT EXISTS "NECESIDADES_ESPECIALES" VARCHAR(255);

CREATE TABLE IF NOT EXISTS "MATRICULAS" (
    "ID" BIGSERIAL PRIMARY KEY,
    "ALUMNO_ID" BIGINT NOT NULL REFERENCES "ALUMNOS"("ID"),
    "CURSO_ID" BIGINT NOT NULL REFERENCES "CURSOS"("ID"),
    "ESTADO" VARCHAR(30) NOT NULL,
    "FECHA_MATRICULA" DATE NOT NULL DEFAULT CURRENT_DATE,
    "ACTIVA" BOOLEAN NOT NULL DEFAULT TRUE,
    "OBSERVACIONES" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "MATRICULA_APODERADOS" (
    "ID" BIGSERIAL PRIMARY KEY,
    "MATRICULA_ID" BIGINT NOT NULL UNIQUE REFERENCES "MATRICULAS"("ID"),
    "RUN" VARCHAR(20) NOT NULL,
    "NOMBRE" VARCHAR(120) NOT NULL,
    "APELLIDOS" VARCHAR(120) NOT NULL,
    "TELEFONO" VARCHAR(30) NOT NULL,
    "EMAIL" VARCHAR(160),
    "RELACION" VARCHAR(80) NOT NULL,
    "AUTORIZADO_RETIRO" BOOLEAN NOT NULL DEFAULT TRUE,
    "ACTIVO" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "MATRICULA_RETIRO_RESPONSABLES" (
    "ID" BIGSERIAL PRIMARY KEY,
    "MATRICULA_ID" BIGINT NOT NULL REFERENCES "MATRICULAS"("ID"),
    "RUN" VARCHAR(20) NOT NULL,
    "NOMBRE" VARCHAR(120) NOT NULL,
    "APELLIDOS" VARCHAR(120) NOT NULL,
    "TELEFONO" VARCHAR(30) NOT NULL,
    "RELACION" VARCHAR(80) NOT NULL,
    "AUTORIZADO_RETIRO" BOOLEAN NOT NULL DEFAULT TRUE,
    "ACTIVO" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "IDX_MATRICULAS_CURSO_ID" ON "MATRICULAS" ("CURSO_ID");
CREATE INDEX IF NOT EXISTS "IDX_MATRICULAS_ALUMNO_ID" ON "MATRICULAS" ("ALUMNO_ID");
CREATE INDEX IF NOT EXISTS "IDX_MATRICULA_RETIRO_MATRICULA_ID" ON "MATRICULA_RETIRO_RESPONSABLES" ("MATRICULA_ID");

INSERT INTO "ALUMNOS" ("RUN", "NOMBRE", "APELLIDOS", "DIRECCION", "FECHA_NACIMIENTO", "GENERO", "NECESIDADES_ESPECIALES", "ACTIVO")
SELECT v."RUN", v."NOMBRE", v."APELLIDOS", v."DIRECCION", v."FECHA_NACIMIENTO", v."GENERO", v."NECESIDADES_ESPECIALES", TRUE
FROM (
    VALUES
        ('21.345.678-9', 'Sofia', 'Martinez Rojas', 'Los Alamos 456, San Bernardo', DATE '2017-03-12', 'Femenino', 'Ninguna'),
        ('22.456.789-0', 'Carlos', 'Gonzalez Perez', 'Pasaje Norte 221, Buin', DATE '2015-07-04', 'Masculino', 'Apoyo en lenguaje'),
        ('23.567.890-1', 'Valentina', 'Rojas Silva', 'Av. Central 890, Maipu', DATE '2019-09-21', 'Femenino', 'Acompañamiento socioemocional'),
        ('24.678.901-2', 'Diego', 'Lopez Morales', 'Calle Uno 334, La Cisterna', DATE '2016-11-08', 'Masculino', 'Ninguna'),
        ('25.789.012-3', 'Emilia', 'Navarro Fuentes', 'Los Canelos 98, El Bosque', DATE '2018-01-19', 'Femenino', 'Alergia alimentaria')
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
        ('21.345.678-9', 'Sofia', 'Martinez Rojas', 'Los Alamos 456, San Bernardo', DATE '2017-03-12', 'Femenino', 'Ninguna'),
        ('22.456.789-0', 'Carlos', 'Gonzalez Perez', 'Pasaje Norte 221, Buin', DATE '2015-07-04', 'Masculino', 'Apoyo en lenguaje'),
        ('23.567.890-1', 'Valentina', 'Rojas Silva', 'Av. Central 890, Maipu', DATE '2019-09-21', 'Femenino', 'Acompañamiento socioemocional'),
        ('24.678.901-2', 'Diego', 'Lopez Morales', 'Calle Uno 334, La Cisterna', DATE '2016-11-08', 'Masculino', 'Ninguna'),
        ('25.789.012-3', 'Emilia', 'Navarro Fuentes', 'Los Canelos 98, El Bosque', DATE '2018-01-19', 'Femenino', 'Alergia alimentaria')
) AS v("RUN", "NOMBRE", "APELLIDOS", "DIRECCION", "FECHA_NACIMIENTO", "GENERO", "NECESIDADES_ESPECIALES")
WHERE a."RUN" = v."RUN";

DELETE FROM "MATRICULA_RETIRO_RESPONSABLES"
WHERE "MATRICULA_ID" IN (
    SELECT m."ID"
    FROM "MATRICULAS" m
    JOIN "ALUMNOS" a ON a."ID" = m."ALUMNO_ID"
    WHERE a."RUN" IN ('21.345.678-9', '22.456.789-0', '23.567.890-1', '24.678.901-2', '25.789.012-3')
);

DELETE FROM "MATRICULA_APODERADOS"
WHERE "MATRICULA_ID" IN (
    SELECT m."ID"
    FROM "MATRICULAS" m
    JOIN "ALUMNOS" a ON a."ID" = m."ALUMNO_ID"
    WHERE a."RUN" IN ('21.345.678-9', '22.456.789-0', '23.567.890-1', '24.678.901-2', '25.789.012-3')
);

DELETE FROM "MATRICULAS"
WHERE "ALUMNO_ID" IN (
    SELECT "ID"
    FROM "ALUMNOS"
    WHERE "RUN" IN ('21.345.678-9', '22.456.789-0', '23.567.890-1', '24.678.901-2', '25.789.012-3')
);

WITH alumnos_base AS (
    SELECT "ID", "RUN"
    FROM "ALUMNOS"
    WHERE "RUN" IN ('21.345.678-9', '22.456.789-0', '23.567.890-1', '24.678.901-2', '25.789.012-3')
),
cursos_base AS (
    SELECT "ID", "NOMBRE"
    FROM "CURSOS"
    WHERE "ACTIVO" = TRUE
      AND "NOMBRE" IN ('3° y 4°', '5° y 6°', 'PK - Kinder - 1°', '5 Basico B')
),
matriculas_seed AS (
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
            ('21.345.678-9', '3° y 4°', 'ACTIVO', DATE '2026-01-15', 'Documentacion completa'),
            ('22.456.789-0', '5° y 6°', 'ACTIVO', DATE '2026-01-18', 'Matricula renovada'),
            ('23.567.890-1', 'PK - Kinder - 1°', 'PENDIENTE', DATE '2026-02-03', 'Pendiente firma de autorizaciones'),
            ('24.678.901-2', '3° y 4°', 'ACTIVO', DATE '2026-01-22', 'Sin observaciones'),
            ('25.789.012-3', '5 Basico B', 'ACTIVO', DATE '2026-01-25', 'Seguimiento por alergia alimentaria')
    ) AS s("RUN", "CURSO", "ESTADO", "FECHA_MATRICULA", "OBSERVACIONES")
    JOIN alumnos_base a ON a."RUN" = s."RUN"
    JOIN cursos_base c ON c."NOMBRE" = s."CURSO"
    RETURNING "ID"
)
SELECT COUNT(*) FROM matriculas_seed;

INSERT INTO "MATRICULA_APODERADOS" (
    "MATRICULA_ID", "RUN", "NOMBRE", "APELLIDOS", "TELEFONO", "EMAIL", "RELACION", "AUTORIZADO_RETIRO", "ACTIVO"
)
SELECT m."ID", s."RUN_APODERADO", s."NOMBRE", s."APELLIDOS", s."TELEFONO", s."EMAIL", s."RELACION", s."AUTORIZADO", TRUE
FROM (
    VALUES
        ('21.345.678-9', '10.234.567-8', 'Ana', 'Martinez Silva', '+56 9 8765 4321', 'ana.martinez@email.com', 'Madre', TRUE),
        ('22.456.789-0', '11.345.678-9', 'Luis', 'Gonzalez Soto', '+56 9 7654 3210', 'luis.gonzalez@email.com', 'Padre', TRUE),
        ('23.567.890-1', '12.456.789-0', 'Carmen', 'Rojas Perez', '+56 9 6543 2109', 'carmen.rojas@email.com', 'Madre', TRUE),
        ('24.678.901-2', '13.567.890-1', 'Maria', 'Lopez Fuentes', '+56 9 5432 1098', 'maria.lopez@email.com', 'Madre', TRUE),
        ('25.789.012-3', '14.678.901-2', 'Paula', 'Navarro Riquelme', '+56 9 4321 0987', 'paula.navarro@email.com', 'Madre', TRUE)
) AS s("RUN_ALUMNO", "RUN_APODERADO", "NOMBRE", "APELLIDOS", "TELEFONO", "EMAIL", "RELACION", "AUTORIZADO")
JOIN "ALUMNOS" a ON a."RUN" = s."RUN_ALUMNO"
JOIN "MATRICULAS" m ON m."ALUMNO_ID" = a."ID" AND m."ACTIVA" = TRUE;

INSERT INTO "MATRICULA_RETIRO_RESPONSABLES" (
    "MATRICULA_ID", "RUN", "NOMBRE", "APELLIDOS", "TELEFONO", "RELACION", "AUTORIZADO_RETIRO", "ACTIVO"
)
SELECT m."ID", s."RUN", s."NOMBRE", s."APELLIDOS", s."TELEFONO", s."RELACION", s."AUTORIZADO", TRUE
FROM (
    VALUES
        ('21.345.678-9', '7.123.456-7', 'Elena', 'Rojas Vega', '+56 9 7654 3210', 'Abuela materna', TRUE),
        ('21.345.678-9', '15.876.543-2', 'Pedro', 'Martinez Fuentes', '+56 9 6543 2109', 'Tio paterno', TRUE),
        ('22.456.789-0', '16.765.432-1', 'Marcela', 'Soto Diaz', '+56 9 6321 1122', 'Tia', TRUE),
        ('23.567.890-1', '17.654.321-0', 'Roberto', 'Perez Araya', '+56 9 6111 2233', 'Padre', TRUE),
        ('24.678.901-2', '18.543.210-9', 'Patricia', 'Morales Tapia', '+56 9 6999 8877', 'Abuela', TRUE),
        ('25.789.012-3', '19.432.109-8', 'Javiera', 'Fuentes Castro', '+56 9 6888 7766', 'Hermana mayor', TRUE)
) AS s("RUN_ALUMNO", "RUN", "NOMBRE", "APELLIDOS", "TELEFONO", "RELACION", "AUTORIZADO")
JOIN "ALUMNOS" a ON a."RUN" = s."RUN_ALUMNO"
JOIN "MATRICULAS" m ON m."ALUMNO_ID" = a."ID" AND m."ACTIVA" = TRUE;
