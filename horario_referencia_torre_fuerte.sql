INSERT INTO "ASIGNATURAS" ("CODIGO", "NOMBRE", "AREA", "COLOR_HEX", "ACTIVA", "DESCRIPCION", "NIVEL_REFERENCIA", "HORAS_SUGERIDAS")
VALUES
    ('SOC', 'Social', 'Formacion integral', '#E7F0D3', TRUE, 'Exploracion social y comprension del entorno cercano.', 'Primer ciclo', 2),
    ('LECESC', 'Lectoescritura', 'Comunicacion', '#EDE4D7', TRUE, 'Desarrollo inicial de lectura, escritura y conciencia fonologica.', 'Inicial y primer ciclo', 4),
    ('LECCOMP', 'Lectura compartida', 'Comunicacion', '#E7DFF3', TRUE, 'Lectura guiada y comprension lectora compartida.', 'Primer ciclo', 2),
    ('RUTINI', 'Rutina inicial', 'Formacion integral', '#E3EDF8', TRUE, 'Activacion del dia, bienvenida y organizacion del aprendizaje.', 'Inicial', 2),
    ('RUTBAN', 'Rutina bano', 'Formacion integral', '#F3E6D9', TRUE, 'Rutina de autonomia y cuidado personal.', 'Inicial', 2)
ON CONFLICT ("CODIGO") DO UPDATE
SET "NOMBRE" = EXCLUDED."NOMBRE",
    "AREA" = EXCLUDED."AREA",
    "COLOR_HEX" = EXCLUDED."COLOR_HEX",
    "ACTIVA" = TRUE,
    "DESCRIPCION" = EXCLUDED."DESCRIPCION",
    "NIVEL_REFERENCIA" = EXCLUDED."NIVEL_REFERENCIA",
    "HORAS_SUGERIDAS" = EXCLUDED."HORAS_SUGERIDAS";

UPDATE "ASIGNATURAS" SET "NOMBRE" = 'Matematica', "AREA" = 'Ciencias basicas', "COLOR_HEX" = '#D7E8FB', "ACTIVA" = TRUE WHERE "CODIGO" = 'MAT';
UPDATE "ASIGNATURAS" SET "NOMBRE" = 'Lenguaje', "AREA" = 'Comunicacion', "COLOR_HEX" = '#F4E1D9', "ACTIVA" = TRUE WHERE "CODIGO" = 'LEN';
UPDATE "ASIGNATURAS" SET "NOMBRE" = 'Historia', "AREA" = 'Humanidades', "COLOR_HEX" = '#F9E6BF', "ACTIVA" = TRUE WHERE "CODIGO" = 'HIS';
UPDATE "ASIGNATURAS" SET "NOMBRE" = 'Ciencias', "AREA" = 'Ciencias basicas', "COLOR_HEX" = '#E2EEC8', "ACTIVA" = TRUE WHERE "CODIGO" = 'CN';
UPDATE "ASIGNATURAS" SET "NOMBRE" = 'Ingles', "AREA" = 'Idiomas', "COLOR_HEX" = '#F4DFE7', "ACTIVA" = TRUE WHERE "CODIGO" = 'ING';
UPDATE "ASIGNATURAS" SET "NOMBRE" = 'Artes', "AREA" = 'Artes', "COLOR_HEX" = '#E4E3FA', "ACTIVA" = TRUE WHERE "CODIGO" = 'ART';
UPDATE "ASIGNATURAS" SET "NOMBRE" = 'Musica', "AREA" = 'Artes', "COLOR_HEX" = '#D6EEEA', "ACTIVA" = TRUE WHERE "CODIGO" = 'MUS';
UPDATE "ASIGNATURAS" SET "NOMBRE" = 'Educacion Fisica', "AREA" = 'Bienestar', "COLOR_HEX" = '#F3A4A4', "ACTIVA" = TRUE WHERE "CODIGO" = 'EFI';
UPDATE "ASIGNATURAS" SET "NOMBRE" = 'Tiempo con Dios', "AREA" = 'Formacion integral', "COLOR_HEX" = '#FFF0BC', "ACTIVA" = TRUE WHERE "CODIGO" = 'TYD';
UPDATE "ASIGNATURAS" SET "NOMBRE" = 'Convivencia', "AREA" = 'Formacion integral', "COLOR_HEX" = '#EFB7CF', "ACTIVA" = TRUE WHERE "CODIGO" = 'CONV';

INSERT INTO "CURSOS" ("CODIGO", "NOMBRE", "NIVEL", "LETRA", "ANIO_ESCOLAR", "JORNADA", "ACTIVO")
VALUES
    ('PKK1-2026', 'PK - Kinder - 1°', 'Inicial', 'A', 2026, 'Manana', TRUE),
    ('34-2026', '3° y 4°', 'Primer ciclo', 'A', 2026, 'Manana', TRUE),
    ('56-2026', '5° y 6°', 'Segundo ciclo', 'A', 2026, 'Manana', TRUE)
ON CONFLICT ("CODIGO") DO UPDATE
SET "NOMBRE" = EXCLUDED."NOMBRE",
    "NIVEL" = EXCLUDED."NIVEL",
    "LETRA" = EXCLUDED."LETRA",
    "ANIO_ESCOLAR" = EXCLUDED."ANIO_ESCOLAR",
    "JORNADA" = EXCLUDED."JORNADA",
    "ACTIVO" = TRUE;

DELETE FROM "HORARIOS_CARGAS"
WHERE "CARGA_DOCENTE_ID" IN (
    SELECT "ID" FROM "CARGAS_DOCENTES"
    WHERE "CURSO_ID" IN (
        SELECT "ID" FROM "CURSOS"
        WHERE "CODIGO" IN ('PKK1-2026', '34-2026', '56-2026')
    )
);

DELETE FROM "CARGAS_DOCENTES"
WHERE "CURSO_ID" IN (
    SELECT "ID" FROM "CURSOS"
    WHERE "CODIGO" IN ('PKK1-2026', '34-2026', '56-2026')
);

INSERT INTO "CARGAS_DOCENTES" ("PROFESOR_ID", "CURSO_ID", "ASIGNATURA_ID", "ANIO_ESCOLAR", "HORAS_SEMANALES", "ES_PROFESOR_JEFE", "ACTIVA")
SELECT pr."ID", c."ID", a."ID", 2026, 0, v."JEFE", TRUE
FROM (
    VALUES
        ('PKK1-2026', 'RUTINI', 'PROF-JP', TRUE),
        ('PKK1-2026', 'ART', 'PROF-MG', FALSE),
        ('PKK1-2026', 'MAT', 'PROF-JP', FALSE),
        ('PKK1-2026', 'SOC', 'PROF-MG', FALSE),
        ('PKK1-2026', 'CN', 'PROF-JP', FALSE),
        ('PKK1-2026', 'LECESC', 'PROF-MG', FALSE),
        ('PKK1-2026', 'RUTBAN', 'PROF-JP', FALSE),
        ('PKK1-2026', 'LECCOMP', 'PROF-MG', FALSE),
        ('PKK1-2026', 'MUS', 'PROF-MG', FALSE),
        ('PKK1-2026', 'ING', 'PROF-MG', FALSE),
        ('PKK1-2026', 'TYD', 'PROF-JP', FALSE),
        ('PKK1-2026', 'CONV', 'PROF-MG', FALSE),
        ('PKK1-2026', 'EFI', 'PROF-JP', FALSE),
        ('34-2026', 'CONV', 'PROF-MG', TRUE),
        ('34-2026', 'MAT', 'PROF-JP', FALSE),
        ('34-2026', 'HIS', 'PROF-MG', FALSE),
        ('34-2026', 'CN', 'PROF-JP', FALSE),
        ('34-2026', 'LEN', 'PROF-MG', FALSE),
        ('34-2026', 'MUS', 'PROF-MG', FALSE),
        ('34-2026', 'EFI', 'PROF-JP', FALSE),
        ('34-2026', 'TYD', 'PROF-JP', FALSE),
        ('34-2026', 'ART', 'PROF-MG', FALSE),
        ('34-2026', 'ING', 'PROF-MG', FALSE),
        ('56-2026', 'MAT', 'PROF-JP', TRUE),
        ('56-2026', 'CN', 'PROF-JP', FALSE),
        ('56-2026', 'LEN', 'PROF-MG', FALSE),
        ('56-2026', 'EFI', 'PROF-JP', FALSE),
        ('56-2026', 'HIS', 'PROF-MG', FALSE),
        ('56-2026', 'MUS', 'PROF-MG', FALSE),
        ('56-2026', 'TYD', 'PROF-JP', FALSE),
        ('56-2026', 'ING', 'PROF-MG', FALSE),
        ('56-2026', 'CONV', 'PROF-MG', FALSE),
        ('56-2026', 'ART', 'PROF-MG', FALSE)
) AS v("CODIGO_CURSO", "CODIGO_ASIGNATURA", "CODIGO_PROFESOR", "JEFE")
JOIN "CURSOS" c ON c."CODIGO" = v."CODIGO_CURSO"
JOIN "ASIGNATURAS" a ON a."CODIGO" = v."CODIGO_ASIGNATURA"
JOIN "PROFESORES" pr ON pr."CODIGO" = v."CODIGO_PROFESOR";

INSERT INTO "HORARIOS_CARGAS" ("CARGA_DOCENTE_ID", "BLOQUE_HORARIO_ID", "SALA")
SELECT cd."ID", bh."ID", v."SALA"
FROM (
    VALUES
        ('PKK1-2026','08:30','09:15','LUNES','RUTINI','SALA-INI'),
        ('PKK1-2026','08:30','09:15','MARTES','RUTINI','SALA-INI'),
        ('PKK1-2026','08:30','09:15','MIERCOLES','RUTINI','SALA-INI'),
        ('PKK1-2026','08:30','09:15','JUEVES','RUTINI','SALA-INI'),
        ('PKK1-2026','08:30','09:15','VIERNES','RUTINI','SALA-INI'),
        ('PKK1-2026','09:15','10:00','LUNES','ART','ART-01'),
        ('PKK1-2026','09:15','10:00','MARTES','MAT','SALA-INI'),
        ('PKK1-2026','09:15','10:00','MIERCOLES','SOC','SALA-INI'),
        ('PKK1-2026','09:15','10:00','JUEVES','CN','LAB-INI'),
        ('PKK1-2026','09:15','10:00','VIERNES','LECESC','SALA-INI'),
        ('PKK1-2026','10:15','11:00','LUNES','MAT','SALA-INI'),
        ('PKK1-2026','10:15','11:00','MARTES','LECCOMP','BIBLIOTECA'),
        ('PKK1-2026','10:15','11:00','MIERCOLES','MUS','MUS-01'),
        ('PKK1-2026','10:15','11:00','JUEVES','LECESC','SALA-INI'),
        ('PKK1-2026','10:15','11:00','VIERNES','CN','LAB-INI'),
        ('PKK1-2026','11:00','11:45','LUNES','MAT','SALA-INI'),
        ('PKK1-2026','11:00','11:45','MARTES','LECCOMP','BIBLIOTECA'),
        ('PKK1-2026','11:00','11:45','MIERCOLES','MUS','MUS-01'),
        ('PKK1-2026','11:00','11:45','JUEVES','LECESC','SALA-INI'),
        ('PKK1-2026','11:00','11:45','VIERNES','ING','SALA-INI'),
        ('PKK1-2026','12:00','12:45','LUNES','TYD','MULTIUSO'),
        ('PKK1-2026','12:00','12:45','MARTES','SOC','SALA-INI'),
        ('PKK1-2026','12:00','12:45','MIERCOLES','MAT','SALA-INI'),
        ('PKK1-2026','12:00','12:45','JUEVES','EFI','PATIO'),
        ('PKK1-2026','12:00','12:45','VIERNES','EFI','PATIO'),
        ('PKK1-2026','12:45','13:30','LUNES','TYD','MULTIUSO'),
        ('PKK1-2026','12:45','13:30','MARTES','CONV','ORIENTACION'),
        ('PKK1-2026','12:45','13:30','MIERCOLES','MAT','SALA-INI'),
        ('PKK1-2026','12:45','13:30','JUEVES','EFI','PATIO'),
        ('PKK1-2026','12:45','13:30','VIERNES','EFI','PATIO'),
        ('34-2026','08:30','09:15','LUNES','CONV','ORIENTACION'),
        ('34-2026','08:30','09:15','MARTES','MAT','SALA-34'),
        ('34-2026','08:30','09:15','MIERCOLES','HIS','SALA-34'),
        ('34-2026','08:30','09:15','JUEVES','CN','LAB-34'),
        ('34-2026','08:30','09:15','VIERNES','LEN','SALA-34'),
        ('34-2026','09:15','10:00','LUNES','CONV','ORIENTACION'),
        ('34-2026','09:15','10:00','MARTES','MAT','SALA-34'),
        ('34-2026','09:15','10:00','MIERCOLES','HIS','SALA-34'),
        ('34-2026','09:15','10:00','JUEVES','CN','LAB-34'),
        ('34-2026','09:15','10:00','VIERNES','LEN','SALA-34'),
        ('34-2026','10:15','11:00','LUNES','MAT','SALA-34'),
        ('34-2026','10:15','11:00','MARTES','LEN','SALA-34'),
        ('34-2026','10:15','11:00','MIERCOLES','MUS','MUS-01'),
        ('34-2026','10:15','11:00','JUEVES','LEN','SALA-34'),
        ('34-2026','10:15','11:00','VIERNES','CN','LAB-34'),
        ('34-2026','11:00','11:45','LUNES','MAT','SALA-34'),
        ('34-2026','11:00','11:45','MARTES','LEN','SALA-34'),
        ('34-2026','11:00','11:45','MIERCOLES','MUS','MUS-01'),
        ('34-2026','11:00','11:45','JUEVES','LEN','SALA-34'),
        ('34-2026','11:00','11:45','VIERNES','CN','LAB-34'),
        ('34-2026','12:00','12:45','LUNES','TYD','MULTIUSO'),
        ('34-2026','12:00','12:45','MARTES','HIS','SALA-34'),
        ('34-2026','12:00','12:45','MIERCOLES','EFI','PATIO'),
        ('34-2026','12:00','12:45','JUEVES','ART','ART-01'),
        ('34-2026','12:00','12:45','VIERNES','ING','SALA-34'),
        ('34-2026','12:45','13:30','LUNES','TYD','MULTIUSO'),
        ('34-2026','12:45','13:30','MARTES','HIS','SALA-34'),
        ('34-2026','12:45','13:30','MIERCOLES','EFI','PATIO'),
        ('34-2026','12:45','13:30','JUEVES','ART','ART-01'),
        ('34-2026','12:45','13:30','VIERNES','ING','SALA-34'),
        ('56-2026','08:30','09:15','LUNES','MAT','SALA-56'),
        ('56-2026','08:30','09:15','MARTES','CN','LAB-56'),
        ('56-2026','08:30','09:15','MIERCOLES','LEN','SALA-56'),
        ('56-2026','08:30','09:15','JUEVES','LEN','SALA-56'),
        ('56-2026','08:30','09:15','VIERNES','CN','LAB-56'),
        ('56-2026','09:15','10:00','LUNES','MAT','SALA-56'),
        ('56-2026','09:15','10:00','MARTES','CN','LAB-56'),
        ('56-2026','09:15','10:00','MIERCOLES','LEN','SALA-56'),
        ('56-2026','09:15','10:00','JUEVES','LEN','SALA-56'),
        ('56-2026','09:15','10:00','VIERNES','CN','LAB-56'),
        ('56-2026','10:15','11:00','LUNES','EFI','PATIO'),
        ('56-2026','10:15','11:00','MARTES','HIS','SALA-56'),
        ('56-2026','10:15','11:00','MIERCOLES','MUS','MUS-01'),
        ('56-2026','10:15','11:00','JUEVES','HIS','SALA-56'),
        ('56-2026','10:15','11:00','VIERNES','LEN','SALA-56'),
        ('56-2026','11:00','11:45','LUNES','EFI','PATIO'),
        ('56-2026','11:00','11:45','MARTES','HIS','SALA-56'),
        ('56-2026','11:00','11:45','MIERCOLES','MUS','MUS-01'),
        ('56-2026','11:00','11:45','JUEVES','HIS','SALA-56'),
        ('56-2026','11:00','11:45','VIERNES','LEN','SALA-56'),
        ('56-2026','12:00','12:45','LUNES','TYD','MULTIUSO'),
        ('56-2026','12:00','12:45','MARTES','MAT','SALA-56'),
        ('56-2026','12:00','12:45','MIERCOLES','ING','SALA-56'),
        ('56-2026','12:00','12:45','JUEVES','CONV','ORIENTACION'),
        ('56-2026','12:00','12:45','VIERNES','ART','ART-02'),
        ('56-2026','12:45','13:30','LUNES','TYD','MULTIUSO'),
        ('56-2026','12:45','13:30','MARTES','MAT','SALA-56'),
        ('56-2026','12:45','13:30','MIERCOLES','ING','SALA-56'),
        ('56-2026','12:45','13:30','JUEVES','CONV','ORIENTACION'),
        ('56-2026','12:45','13:30','VIERNES','ART','ART-02')
) AS v("CODIGO_CURSO","HORA_INICIO","HORA_FIN","DIA_SEMANA","CODIGO_ASIGNATURA","SALA")
JOIN "CURSOS" c ON c."CODIGO" = v."CODIGO_CURSO"
JOIN "ASIGNATURAS" a ON a."CODIGO" = v."CODIGO_ASIGNATURA"
JOIN "CARGAS_DOCENTES" cd
  ON cd."CURSO_ID" = c."ID"
 AND cd."ASIGNATURA_ID" = a."ID"
 AND cd."ANIO_ESCOLAR" = c."ANIO_ESCOLAR"
JOIN "BLOQUES_HORARIOS" bh
  ON bh."DIA_SEMANA" = v."DIA_SEMANA"
 AND to_char(bh."HORA_INICIO", 'HH24:MI') = v."HORA_INICIO"
 AND to_char(bh."HORA_FIN", 'HH24:MI') = v."HORA_FIN";

UPDATE "CARGAS_DOCENTES" cd
SET "HORAS_SEMANALES" = sub.total
FROM (
    SELECT hc."CARGA_DOCENTE_ID" AS carga_id, COUNT(*) AS total
    FROM "HORARIOS_CARGAS" hc
    GROUP BY hc."CARGA_DOCENTE_ID"
) sub
WHERE cd."ID" = sub.carga_id;
