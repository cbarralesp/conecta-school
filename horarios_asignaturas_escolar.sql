ALTER TABLE "ASIGNATURAS"
    ADD COLUMN IF NOT EXISTS "DESCRIPCION" TEXT,
    ADD COLUMN IF NOT EXISTS "NIVEL_REFERENCIA" VARCHAR(80),
    ADD COLUMN IF NOT EXISTS "HORAS_SUGERIDAS" INTEGER NOT NULL DEFAULT 2;

UPDATE "ASIGNATURAS"
SET "DESCRIPCION" = COALESCE("DESCRIPCION", "NOMBRE"),
    "NIVEL_REFERENCIA" = COALESCE("NIVEL_REFERENCIA", 'Ensenanza basica'),
    "HORAS_SUGERIDAS" = COALESCE("HORAS_SUGERIDAS", 2);

ALTER TABLE "BLOQUES_HORARIOS"
    ADD COLUMN IF NOT EXISTS "TIPO_BLOQUE" VARCHAR(20) NOT NULL DEFAULT 'CLASE';

UPDATE "BLOQUES_HORARIOS"
SET "TIPO_BLOQUE" = COALESCE("TIPO_BLOQUE", 'CLASE');

INSERT INTO "ASIGNATURAS" ("CODIGO", "NOMBRE", "AREA", "COLOR_HEX", "ACTIVA", "DESCRIPCION", "NIVEL_REFERENCIA", "HORAS_SUGERIDAS")
VALUES
    ('MAT', 'Matematica', 'Ciencias basicas', '#D7E8FB', TRUE, 'Desarrollo del pensamiento numerico, algebraico y resolucion de problemas.', 'Ensenanza basica', 6),
    ('LEN', 'Lenguaje', 'Comunicacion', '#F4E1D9', TRUE, 'Lectura, escritura, oralidad y comprension de textos.', 'Ensenanza basica', 6),
    ('CN', 'Ciencias', 'Ciencias basicas', '#E2EEC8', TRUE, 'Exploracion del entorno natural, metodo cientifico y laboratorio escolar.', 'Ensenanza basica', 4),
    ('HIS', 'Historia', 'Humanidades', '#F9E6BF', TRUE, 'Historia, geografia, formacion ciudadana y patrimonio.', 'Ensenanza basica', 3),
    ('EFI', 'Ed. Fisica', 'Bienestar', '#F3A4A4', TRUE, 'Movimiento, vida saludable y habilidades motrices.', 'Ensenanza basica', 2),
    ('MUS', 'Musica', 'Artes', '#D6EEEA', TRUE, 'Expresion musical, audicion y practica ritmica.', 'Ensenanza basica', 2),
    ('ING', 'Ingles', 'Idiomas', '#F4DFE7', TRUE, 'Comunicación basica en ingles, vocabulario y expresion oral.', 'Ensenanza basica', 2),
    ('CONV', 'Convivencia', 'Formacion integral', '#EFB7CF', TRUE, 'Convivencia escolar, bienestar socioemocional y vida en comunidad.', 'Ensenanza basica', 2),
    ('ART', 'Artes', 'Artes', '#E4E3FA', TRUE, 'Creacion artistica, apreciacion visual y expresion creativa.', 'Ensenanza basica', 2),
    ('TYD', 'Tiempo con Dios', 'Formacion integral', '#FFF0BC', TRUE, 'Formacion valórica y reflexion guiada.', 'Ensenanza basica', 2)
ON CONFLICT ("CODIGO") DO UPDATE
SET "NOMBRE" = EXCLUDED."NOMBRE",
    "AREA" = EXCLUDED."AREA",
    "COLOR_HEX" = EXCLUDED."COLOR_HEX",
    "ACTIVA" = TRUE,
    "DESCRIPCION" = EXCLUDED."DESCRIPCION",
    "NIVEL_REFERENCIA" = EXCLUDED."NIVEL_REFERENCIA",
    "HORAS_SUGERIDAS" = EXCLUDED."HORAS_SUGERIDAS";

INSERT INTO "BLOQUES_HORARIOS" ("DIA_SEMANA", "HORA_INICIO", "HORA_FIN", "ORDEN", "ACTIVO", "TIPO_BLOQUE")
VALUES
    ('LUNES', TIME '08:30', TIME '09:15', 1, TRUE, 'CLASE'),
    ('LUNES', TIME '09:15', TIME '10:00', 2, TRUE, 'CLASE'),
    ('LUNES', TIME '10:00', TIME '10:15', 3, TRUE, 'RECREO'),
    ('LUNES', TIME '10:15', TIME '11:00', 4, TRUE, 'CLASE'),
    ('LUNES', TIME '11:00', TIME '11:45', 5, TRUE, 'CLASE'),
    ('LUNES', TIME '11:45', TIME '12:00', 6, TRUE, 'RECREO'),
    ('LUNES', TIME '12:00', TIME '12:45', 7, TRUE, 'CLASE'),
    ('LUNES', TIME '12:45', TIME '13:30', 8, TRUE, 'CLASE'),
    ('MARTES', TIME '08:30', TIME '09:15', 1, TRUE, 'CLASE'),
    ('MARTES', TIME '09:15', TIME '10:00', 2, TRUE, 'CLASE'),
    ('MARTES', TIME '10:00', TIME '10:15', 3, TRUE, 'RECREO'),
    ('MARTES', TIME '10:15', TIME '11:00', 4, TRUE, 'CLASE'),
    ('MARTES', TIME '11:00', TIME '11:45', 5, TRUE, 'CLASE'),
    ('MARTES', TIME '11:45', TIME '12:00', 6, TRUE, 'RECREO'),
    ('MARTES', TIME '12:00', TIME '12:45', 7, TRUE, 'CLASE'),
    ('MARTES', TIME '12:45', TIME '13:30', 8, TRUE, 'CLASE'),
    ('MIERCOLES', TIME '08:30', TIME '09:15', 1, TRUE, 'CLASE'),
    ('MIERCOLES', TIME '09:15', TIME '10:00', 2, TRUE, 'CLASE'),
    ('MIERCOLES', TIME '10:00', TIME '10:15', 3, TRUE, 'RECREO'),
    ('MIERCOLES', TIME '10:15', TIME '11:00', 4, TRUE, 'CLASE'),
    ('MIERCOLES', TIME '11:00', TIME '11:45', 5, TRUE, 'CLASE'),
    ('MIERCOLES', TIME '11:45', TIME '12:00', 6, TRUE, 'RECREO'),
    ('MIERCOLES', TIME '12:00', TIME '12:45', 7, TRUE, 'CLASE'),
    ('MIERCOLES', TIME '12:45', TIME '13:30', 8, TRUE, 'CLASE'),
    ('JUEVES', TIME '08:30', TIME '09:15', 1, TRUE, 'CLASE'),
    ('JUEVES', TIME '09:15', TIME '10:00', 2, TRUE, 'CLASE'),
    ('JUEVES', TIME '10:00', TIME '10:15', 3, TRUE, 'RECREO'),
    ('JUEVES', TIME '10:15', TIME '11:00', 4, TRUE, 'CLASE'),
    ('JUEVES', TIME '11:00', TIME '11:45', 5, TRUE, 'CLASE'),
    ('JUEVES', TIME '11:45', TIME '12:00', 6, TRUE, 'RECREO'),
    ('JUEVES', TIME '12:00', TIME '12:45', 7, TRUE, 'CLASE'),
    ('JUEVES', TIME '12:45', TIME '13:30', 8, TRUE, 'CLASE'),
    ('VIERNES', TIME '08:30', TIME '09:15', 1, TRUE, 'CLASE'),
    ('VIERNES', TIME '09:15', TIME '10:00', 2, TRUE, 'CLASE'),
    ('VIERNES', TIME '10:00', TIME '10:15', 3, TRUE, 'RECREO'),
    ('VIERNES', TIME '10:15', TIME '11:00', 4, TRUE, 'CLASE'),
    ('VIERNES', TIME '11:00', TIME '11:45', 5, TRUE, 'CLASE'),
    ('VIERNES', TIME '11:45', TIME '12:00', 6, TRUE, 'RECREO'),
    ('VIERNES', TIME '12:00', TIME '12:45', 7, TRUE, 'CLASE'),
    ('VIERNES', TIME '12:45', TIME '13:30', 8, TRUE, 'CLASE')
ON CONFLICT ("DIA_SEMANA", "ORDEN") DO UPDATE
SET "HORA_INICIO" = EXCLUDED."HORA_INICIO",
    "HORA_FIN" = EXCLUDED."HORA_FIN",
    "ACTIVO" = TRUE,
    "TIPO_BLOQUE" = EXCLUDED."TIPO_BLOQUE";

INSERT INTO "CARGAS_DOCENTES" ("PROFESOR_ID", "CURSO_ID", "ASIGNATURA_ID", "ANIO_ESCOLAR", "HORAS_SEMANALES", "ES_PROFESOR_JEFE", "ACTIVA")
SELECT pr."ID", c."ID", a."ID", c."ANIO_ESCOLAR", v."HORAS_SEMANALES", v."ES_PROFESOR_JEFE", TRUE
FROM (
    VALUES
        ('PROF-JP', '5B-2026', 'MAT', 4, TRUE),
        ('PROF-JP', '5B-2026', 'CN', 3, FALSE),
        ('PROF-MG', '5B-2026', 'LEN', 4, FALSE),
        ('PROF-MG', '5B-2026', 'HIS', 2, FALSE),
        ('PROF-JP', '5B-2026', 'EFI', 2, FALSE),
        ('PROF-MG', '5B-2026', 'MUS', 2, FALSE),
        ('PROF-MG', '5B-2026', 'ING', 2, FALSE),
        ('PROF-MG', '5B-2026', 'CONV', 2, FALSE),
        ('PROF-MG', '5B-2026', 'ART', 2, FALSE),
        ('PROF-JP', '5B-2026', 'TYD', 2, FALSE),
        ('PROF-JP', '6A-2026', 'MAT', 4, TRUE),
        ('PROF-MG', '6A-2026', 'LEN', 4, FALSE),
        ('PROF-JP', '6A-2026', 'CN', 3, FALSE),
        ('PROF-MG', '6A-2026', 'HIS', 2, FALSE),
        ('PROF-MG', '7A-2026', 'LEN', 5, TRUE),
        ('PROF-JP', '7A-2026', 'MAT', 4, FALSE),
        ('PROF-MG', '8B-2026', 'HIS', 4, TRUE)
) AS v("CODIGO_PROFESOR", "CODIGO_CURSO", "CODIGO_ASIGNATURA", "HORAS_SEMANALES", "ES_PROFESOR_JEFE")
JOIN "PROFESORES" pr ON pr."CODIGO" = v."CODIGO_PROFESOR"
JOIN "CURSOS" c ON c."CODIGO" = v."CODIGO_CURSO"
JOIN "ASIGNATURAS" a ON a."CODIGO" = v."CODIGO_ASIGNATURA"
WHERE NOT EXISTS (
    SELECT 1
    FROM "CARGAS_DOCENTES" cd
    WHERE cd."PROFESOR_ID" = pr."ID"
      AND cd."CURSO_ID" = c."ID"
      AND cd."ASIGNATURA_ID" = a."ID"
      AND cd."ANIO_ESCOLAR" = c."ANIO_ESCOLAR"
);

DELETE FROM "HORARIOS_CARGAS"
WHERE "CARGA_DOCENTE_ID" IN (
    SELECT cd."ID"
    FROM "CARGAS_DOCENTES" cd
    JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
    WHERE c."CODIGO" IN ('5B-2026', '6A-2026')
);

INSERT INTO "HORARIOS_CARGAS" ("CARGA_DOCENTE_ID", "BLOQUE_HORARIO_ID", "SALA")
SELECT cd."ID", bh."ID", v."SALA"
FROM (
    VALUES
        ('5B-2026', 'MAT', 'LUNES', 1, 'SALA-12'),
        ('5B-2026', 'MAT', 'LUNES', 2, 'SALA-12'),
        ('5B-2026', 'CN', 'MARTES', 1, 'LAB-01'),
        ('5B-2026', 'CN', 'MARTES', 2, 'LAB-01'),
        ('5B-2026', 'LEN', 'MIERCOLES', 1, 'SALA-12'),
        ('5B-2026', 'LEN', 'MIERCOLES', 2, 'SALA-12'),
        ('5B-2026', 'LEN', 'JUEVES', 1, 'SALA-12'),
        ('5B-2026', 'LEN', 'JUEVES', 2, 'SALA-12'),
        ('5B-2026', 'CN', 'VIERNES', 1, 'LAB-01'),
        ('5B-2026', 'CN', 'VIERNES', 2, 'LAB-01'),
        ('5B-2026', 'EFI', 'LUNES', 4, 'PATIO'),
        ('5B-2026', 'EFI', 'LUNES', 5, 'PATIO'),
        ('5B-2026', 'HIS', 'MARTES', 4, 'SALA-10'),
        ('5B-2026', 'HIS', 'MARTES', 5, 'SALA-10'),
        ('5B-2026', 'MUS', 'MIERCOLES', 4, 'MUS-01'),
        ('5B-2026', 'MUS', 'MIERCOLES', 5, 'MUS-01'),
        ('5B-2026', 'HIS', 'JUEVES', 4, 'SALA-10'),
        ('5B-2026', 'HIS', 'JUEVES', 5, 'SALA-10'),
        ('5B-2026', 'LEN', 'VIERNES', 4, 'SALA-12'),
        ('5B-2026', 'LEN', 'VIERNES', 5, 'SALA-12'),
        ('5B-2026', 'TYD', 'LUNES', 7, 'MULTIUSO'),
        ('5B-2026', 'TYD', 'LUNES', 8, 'MULTIUSO'),
        ('5B-2026', 'MAT', 'MARTES', 7, 'SALA-12'),
        ('5B-2026', 'MAT', 'MARTES', 8, 'SALA-12'),
        ('5B-2026', 'ING', 'MIERCOLES', 7, 'SALA-09'),
        ('5B-2026', 'ING', 'MIERCOLES', 8, 'SALA-09'),
        ('5B-2026', 'CONV', 'JUEVES', 7, 'ORIENTACION'),
        ('5B-2026', 'CONV', 'JUEVES', 8, 'ORIENTACION'),
        ('5B-2026', 'ART', 'VIERNES', 7, 'ART-02'),
        ('5B-2026', 'ART', 'VIERNES', 8, 'ART-02'),
        ('6A-2026', 'MAT', 'LUNES', 1, 'SALA-14'),
        ('6A-2026', 'LEN', 'MARTES', 1, 'SALA-14'),
        ('6A-2026', 'CN', 'MIERCOLES', 4, 'LAB-02'),
        ('6A-2026', 'HIS', 'JUEVES', 4, 'SALA-11'),
        ('6A-2026', 'MAT', 'VIERNES', 7, 'SALA-14')
) AS v("CODIGO_CURSO", "CODIGO_ASIGNATURA", "DIA_SEMANA", "ORDEN", "SALA")
JOIN "CURSOS" c ON c."CODIGO" = v."CODIGO_CURSO"
JOIN "ASIGNATURAS" a ON a."CODIGO" = v."CODIGO_ASIGNATURA"
JOIN "CARGAS_DOCENTES" cd
    ON cd."CURSO_ID" = c."ID"
   AND cd."ASIGNATURA_ID" = a."ID"
   AND cd."ANIO_ESCOLAR" = c."ANIO_ESCOLAR"
   AND cd."ACTIVA" = TRUE
JOIN "BLOQUES_HORARIOS" bh
    ON bh."DIA_SEMANA" = v."DIA_SEMANA"
   AND bh."ORDEN" = v."ORDEN"
WHERE NOT EXISTS (
    SELECT 1
    FROM "HORARIOS_CARGAS" hc
    WHERE hc."CARGA_DOCENTE_ID" = cd."ID"
      AND hc."BLOQUE_HORARIO_ID" = bh."ID"
);
