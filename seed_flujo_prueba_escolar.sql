DO $$
DECLARE
    v_teacher_person_id BIGINT;
    v_teacher_id BIGINT;
    v_student_id BIGINT;
    v_subject_id BIGINT;
    v_course_id BIGINT := 7;
    v_period_id BIGINT := 2;
    v_enrollment_id BIGINT;
    v_record_id BIGINT;
    v_load_id BIGINT;
    v_eval_1_id BIGINT;
    v_eval_2_id BIGINT;
    v_hash TEXT := '$2a$10$gPydrVgBkZPFVLCQcMsNOenJaMgRsVHa20q.W.B0n8CgWQHVxz3eC';
BEGIN
    INSERT INTO "PERSONAS" (
        "RUN", "NOMBRES", "APELLIDOS", "CORREO_ELECTRONICO", "DIRECCION",
        "TELEFONO", "FECHA_NACIMIENTO", "GENERO"
    )
    VALUES (
        '22.222.222-2', 'Patricia', 'Prueba Docente', 'patricia.prueba@tfs.cl',
        'Av. Siempre Viva 742, San Bernardo', '+56 9 7000 1111', DATE '1990-05-15', 'Femenino'
    )
    ON CONFLICT ("RUN") DO UPDATE
    SET
        "NOMBRES" = EXCLUDED."NOMBRES",
        "APELLIDOS" = EXCLUDED."APELLIDOS",
        "CORREO_ELECTRONICO" = EXCLUDED."CORREO_ELECTRONICO",
        "DIRECCION" = EXCLUDED."DIRECCION",
        "TELEFONO" = EXCLUDED."TELEFONO",
        "FECHA_NACIMIENTO" = EXCLUDED."FECHA_NACIMIENTO",
        "GENERO" = EXCLUDED."GENERO"
    RETURNING "ID" INTO v_teacher_person_id;

    INSERT INTO "PROFESORES" (
        "PERSONA_ID", "CODIGO", "ESPECIALIDAD", "ACTIVO", "TITULO_PROFESIONAL",
        "TIPO_CONTRATO", "HORAS_SEMANALES", "FECHA_INGRESO", "ESTADO_DOCENTE"
    )
    VALUES (
        v_teacher_person_id, 'PRB-DOC', 'Evaluacion y apoyo pedagogico', TRUE,
        'Profesora de Educacion General Basica', 'Jornada parcial', 2, DATE '2026-03-01', 'Activo'
    )
    ON CONFLICT ("PERSONA_ID") DO UPDATE
    SET
        "CODIGO" = EXCLUDED."CODIGO",
        "ESPECIALIDAD" = EXCLUDED."ESPECIALIDAD",
        "ACTIVO" = TRUE,
        "TITULO_PROFESIONAL" = EXCLUDED."TITULO_PROFESIONAL",
        "TIPO_CONTRATO" = EXCLUDED."TIPO_CONTRATO",
        "HORAS_SEMANALES" = EXCLUDED."HORAS_SEMANALES",
        "FECHA_INGRESO" = EXCLUDED."FECHA_INGRESO",
        "ESTADO_DOCENTE" = EXCLUDED."ESTADO_DOCENTE"
    RETURNING "ID" INTO v_teacher_id;

    INSERT INTO "USUARIOS" ("PERSONA_ID", "USUARIO", "CLAVE", "ACTIVO")
    VALUES (v_teacher_person_id, 'pprueba', v_hash, TRUE)
    ON CONFLICT ("USUARIO") DO UPDATE
    SET
        "PERSONA_ID" = EXCLUDED."PERSONA_ID",
        "CLAVE" = EXCLUDED."CLAVE",
        "ACTIVO" = TRUE;

    UPDATE "PROFESOR_CONTACTOS_EMERGENCIA"
    SET
        "NOMBRE_COMPLETO" = 'Sergio Prueba',
        "RELACION" = 'Hermano',
        "TELEFONO" = '+56 9 7000 2222',
        "ACTIVO" = TRUE
    WHERE "PROFESOR_ID" = v_teacher_id;

    IF NOT FOUND THEN
        INSERT INTO "PROFESOR_CONTACTOS_EMERGENCIA" (
            "PROFESOR_ID", "NOMBRE_COMPLETO", "RELACION", "TELEFONO", "ACTIVO"
        )
        VALUES (v_teacher_id, 'Sergio Prueba', 'Hermano', '+56 9 7000 2222', TRUE);
    END IF;

    INSERT INTO "ASIGNATURAS" (
        "CODIGO", "NOMBRE", "AREA", "COLOR_HEX", "ACTIVA",
        "DESCRIPCION", "NIVEL_REFERENCIA", "HORAS_SUGERIDAS"
    )
    VALUES (
        'PRB', 'Taller de Prueba', 'Integracion', '#8EC5A4', TRUE,
        'Asignatura de prueba para validacion de flujo integral.', 'Ensenanza basica', 2
    )
    ON CONFLICT ("CODIGO") DO UPDATE
    SET
        "NOMBRE" = EXCLUDED."NOMBRE",
        "AREA" = EXCLUDED."AREA",
        "COLOR_HEX" = EXCLUDED."COLOR_HEX",
        "ACTIVA" = TRUE,
        "DESCRIPCION" = EXCLUDED."DESCRIPCION",
        "NIVEL_REFERENCIA" = EXCLUDED."NIVEL_REFERENCIA",
        "HORAS_SUGERIDAS" = EXCLUDED."HORAS_SUGERIDAS"
    RETURNING "ID" INTO v_subject_id;

    UPDATE "PROFESOR_ASIGNATURAS"
    SET
        "ASIGNATURA" = 'Taller de Prueba',
        "ACTIVO" = TRUE,
        "ASIGNATURA_ID" = v_subject_id
    WHERE "PROFESOR_ID" = v_teacher_id
      AND ("ASIGNATURA_ID" = v_subject_id OR "ASIGNATURA" = 'Taller de Prueba');

    IF NOT FOUND THEN
        INSERT INTO "PROFESOR_ASIGNATURAS" ("PROFESOR_ID", "ASIGNATURA", "ACTIVO", "ASIGNATURA_ID")
        VALUES (v_teacher_id, 'Taller de Prueba', TRUE, v_subject_id);
    END IF;

    UPDATE "CURSO_DOCENTES"
    SET
        "PROFESOR_ID" = v_teacher_id,
        "ASISTENTE_ID" = NULL
    WHERE "CURSO_ID" = v_course_id;

    IF NOT FOUND THEN
        INSERT INTO "CURSO_DOCENTES" ("CURSO_ID", "PROFESOR_ID", "ASISTENTE_ID")
        VALUES (v_course_id, v_teacher_id, NULL);
    END IF;

    INSERT INTO "CARGAS_DOCENTES" (
        "PROFESOR_ID", "CURSO_ID", "ASIGNATURA_ID", "ANIO_ESCOLAR",
        "HORAS_SEMANALES", "ES_PROFESOR_JEFE", "ACTIVA"
    )
    VALUES (v_teacher_id, v_course_id, v_subject_id, 2026, 2, FALSE, TRUE)
    ON CONFLICT ("PROFESOR_ID", "CURSO_ID", "ASIGNATURA_ID", "ANIO_ESCOLAR") DO UPDATE
    SET
        "HORAS_SEMANALES" = EXCLUDED."HORAS_SEMANALES",
        "ACTIVA" = TRUE
    RETURNING "ID" INTO v_load_id;

    INSERT INTO "CURSO_ASIGNATURAS" ("CURSO_ID", "ASIGNATURA_ID", "ACTIVA")
    VALUES (v_course_id, v_subject_id, TRUE)
    ON CONFLICT ("CURSO_ID", "ASIGNATURA_ID") DO UPDATE
    SET "ACTIVA" = TRUE;

    INSERT INTO "HORARIOS_CARGAS" ("CARGA_DOCENTE_ID", "BLOQUE_HORARIO_ID", "SALA")
    VALUES (v_load_id, 6, 'Sala Prueba 1')
    ON CONFLICT ("CARGA_DOCENTE_ID", "BLOQUE_HORARIO_ID") DO UPDATE
    SET "SALA" = EXCLUDED."SALA";

    INSERT INTO "HORARIOS_CARGAS" ("CARGA_DOCENTE_ID", "BLOQUE_HORARIO_ID", "SALA")
    VALUES (v_load_id, 11, 'Sala Prueba 1')
    ON CONFLICT ("CARGA_DOCENTE_ID", "BLOQUE_HORARIO_ID") DO UPDATE
    SET "SALA" = EXCLUDED."SALA";

    UPDATE "CARGAS_DOCENTES"
    SET "HORAS_SEMANALES" = (
        SELECT COUNT(1)
        FROM "HORARIOS_CARGAS"
        WHERE "CARGA_DOCENTE_ID" = v_load_id
    )
    WHERE "ID" = v_load_id;

    INSERT INTO "ALUMNOS" (
        "RUN", "NOMBRE", "APELLIDOS", "DIRECCION", "FECHA_NACIMIENTO",
        "ACTIVO", "GENERO", "NECESIDADES_ESPECIALES"
    )
    VALUES (
        '33.333.333-3', 'Bruno', 'Prueba Alumno', 'Pasaje Escolar 123, Buin',
        DATE '2017-08-21', TRUE, 'Masculino', 'No'
    )
    ON CONFLICT ("RUN") DO UPDATE
    SET
        "NOMBRE" = EXCLUDED."NOMBRE",
        "APELLIDOS" = EXCLUDED."APELLIDOS",
        "DIRECCION" = EXCLUDED."DIRECCION",
        "FECHA_NACIMIENTO" = EXCLUDED."FECHA_NACIMIENTO",
        "ACTIVO" = TRUE,
        "GENERO" = EXCLUDED."GENERO",
        "NECESIDADES_ESPECIALES" = EXCLUDED."NECESIDADES_ESPECIALES"
    RETURNING "ID" INTO v_student_id;

    SELECT "ID"
    INTO v_enrollment_id
    FROM "MATRICULAS"
    WHERE "ALUMNO_ID" = v_student_id
    ORDER BY "ID"
    LIMIT 1;

    IF v_enrollment_id IS NULL THEN
        INSERT INTO "MATRICULAS" (
            "ALUMNO_ID", "CURSO_ID", "ESTADO", "FECHA_MATRICULA", "ACTIVA", "OBSERVACIONES"
        )
        VALUES (
            v_student_id, v_course_id, 'ACTIVO', DATE '2026-03-10', TRUE, 'Matricula de prueba integral'
        )
        RETURNING "ID" INTO v_enrollment_id;
    ELSE
        UPDATE "MATRICULAS"
        SET
            "CURSO_ID" = v_course_id,
            "ESTADO" = 'ACTIVO',
            "FECHA_MATRICULA" = DATE '2026-03-10',
            "ACTIVA" = TRUE,
            "OBSERVACIONES" = 'Matricula de prueba integral'
        WHERE "ID" = v_enrollment_id;
    END IF;

    UPDATE "MATRICULA_APODERADOS"
    SET
        "RUN" = '44.444.444-4',
        "NOMBRE" = 'Andrea',
        "APELLIDOS" = 'Prueba Apoderada',
        "TELEFONO" = '+56 9 7000 3333',
        "EMAIL" = 'andrea.apoderada@tfs.cl',
        "RELACION" = 'Madre',
        "AUTORIZADO_RETIRO" = TRUE,
        "ACTIVO" = TRUE
    WHERE "MATRICULA_ID" = v_enrollment_id;

    IF NOT FOUND THEN
        INSERT INTO "MATRICULA_APODERADOS" (
            "MATRICULA_ID", "RUN", "NOMBRE", "APELLIDOS", "TELEFONO",
            "EMAIL", "RELACION", "AUTORIZADO_RETIRO", "ACTIVO"
        )
        VALUES (
            v_enrollment_id, '44.444.444-4', 'Andrea', 'Prueba Apoderada', '+56 9 7000 3333',
            'andrea.apoderada@tfs.cl', 'Madre', TRUE, TRUE
        );
    END IF;

    UPDATE "MATRICULA_RETIRO_RESPONSABLES"
    SET
        "NOMBRE" = 'Marco',
        "APELLIDOS" = 'Prueba Retiro',
        "TELEFONO" = '+56 9 7000 4444',
        "RELACION" = 'Tio',
        "AUTORIZADO_RETIRO" = TRUE,
        "ACTIVO" = TRUE
    WHERE "MATRICULA_ID" = v_enrollment_id
      AND "RUN" = '55.555.555-5';

    IF NOT FOUND THEN
        INSERT INTO "MATRICULA_RETIRO_RESPONSABLES" (
            "MATRICULA_ID", "RUN", "NOMBRE", "APELLIDOS", "TELEFONO",
            "RELACION", "AUTORIZADO_RETIRO", "ACTIVO"
        )
        VALUES (
            v_enrollment_id, '55.555.555-5', 'Marco', 'Prueba Retiro', '+56 9 7000 4444',
            'Tio', TRUE, TRUE
        );
    END IF;

    INSERT INTO "ASISTENCIA_REGISTROS" ("CURSO_ID", "FECHA", "ACTIVO", "CREADO_EN", "ACTUALIZADO_EN")
    VALUES (v_course_id, DATE '2026-04-03', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("CURSO_ID", "FECHA") DO UPDATE
    SET "ACTUALIZADO_EN" = CURRENT_TIMESTAMP
    RETURNING "ID" INTO v_record_id;

    INSERT INTO "ASISTENCIA_DETALLES" (
        "REGISTRO_ID", "ALUMNO_ID", "ESTADO", "HORA_LLEGADA", "OBSERVACION",
        "ACTIVO", "CREADO_EN", "ACTUALIZADO_EN"
    )
    VALUES (
        v_record_id, v_student_id, 'PRESENTE', TIME '08:35', 'Registro de prueba',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("REGISTRO_ID", "ALUMNO_ID") DO UPDATE
    SET
        "ESTADO" = EXCLUDED."ESTADO",
        "HORA_LLEGADA" = EXCLUDED."HORA_LLEGADA",
        "OBSERVACION" = EXCLUDED."OBSERVACION",
        "ACTIVO" = TRUE,
        "ACTUALIZADO_EN" = CURRENT_TIMESTAMP;

    SELECT "ID"
    INTO v_eval_1_id
    FROM "EVALUACIONES"
    WHERE "CURSO_ID" = v_course_id
      AND "ASIGNATURA_ID" = v_subject_id
      AND "PERIODO_ID" = v_period_id
      AND "CODIGO" = 'PR1'
    LIMIT 1;

    IF v_eval_1_id IS NULL THEN
        INSERT INTO "EVALUACIONES" (
            "CURSO_ID", "ASIGNATURA_ID", "PERIODO_ID", "CODIGO", "NOMBRE",
            "ORDEN", "PONDERACION", "ACTIVA"
        )
        VALUES (v_course_id, v_subject_id, v_period_id, 'PR1', 'Prueba 1', 1, 50, TRUE)
        RETURNING "ID" INTO v_eval_1_id;
    ELSE
        UPDATE "EVALUACIONES"
        SET
            "NOMBRE" = 'Prueba 1',
            "ORDEN" = 1,
            "PONDERACION" = 50,
            "ACTIVA" = TRUE
        WHERE "ID" = v_eval_1_id;
    END IF;

    SELECT "ID"
    INTO v_eval_2_id
    FROM "EVALUACIONES"
    WHERE "CURSO_ID" = v_course_id
      AND "ASIGNATURA_ID" = v_subject_id
      AND "PERIODO_ID" = v_period_id
      AND "CODIGO" = 'PR2'
    LIMIT 1;

    IF v_eval_2_id IS NULL THEN
        INSERT INTO "EVALUACIONES" (
            "CURSO_ID", "ASIGNATURA_ID", "PERIODO_ID", "CODIGO", "NOMBRE",
            "ORDEN", "PONDERACION", "ACTIVA"
        )
        VALUES (v_course_id, v_subject_id, v_period_id, 'PR2', 'Prueba 2', 2, 50, TRUE)
        RETURNING "ID" INTO v_eval_2_id;
    ELSE
        UPDATE "EVALUACIONES"
        SET
            "NOMBRE" = 'Prueba 2',
            "ORDEN" = 2,
            "PONDERACION" = 50,
            "ACTIVA" = TRUE
        WHERE "ID" = v_eval_2_id;
    END IF;

    INSERT INTO "CALIFICACIONES" (
        "EVALUACION_ID", "ALUMNO_ID", "NOTA", "OBSERVACION", "ACTIVA", "CREADO_EN", "ACTUALIZADO_EN"
    )
    VALUES (v_eval_1_id, v_student_id, 6.4, 'Nota de prueba 1', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("EVALUACION_ID", "ALUMNO_ID") DO UPDATE
    SET
        "NOTA" = EXCLUDED."NOTA",
        "OBSERVACION" = EXCLUDED."OBSERVACION",
        "ACTIVA" = TRUE,
        "ACTUALIZADO_EN" = CURRENT_TIMESTAMP;

    INSERT INTO "CALIFICACIONES" (
        "EVALUACION_ID", "ALUMNO_ID", "NOTA", "OBSERVACION", "ACTIVA", "CREADO_EN", "ACTUALIZADO_EN"
    )
    VALUES (v_eval_2_id, v_student_id, 5.9, 'Nota de prueba 2', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("EVALUACION_ID", "ALUMNO_ID") DO UPDATE
    SET
        "NOTA" = EXCLUDED."NOTA",
        "OBSERVACION" = EXCLUDED."OBSERVACION",
        "ACTIVA" = TRUE,
        "ACTUALIZADO_EN" = CURRENT_TIMESTAMP;

    UPDATE "ACTIVIDADES_ESCOLARES"
    SET
        "TIPO_ACTIVIDAD_ID" = 4,
        "DESCRIPCION" = 'Actividad creada para validar el flujo integral del sistema.',
        "FECHA_FIN" = DATE '2026-04-15',
        "HORA" = TIME '10:00',
        "UBICACION" = 'Patio central',
        "ACTIVO" = TRUE
    WHERE "TITULO" = 'Actividad integral de prueba'
      AND "FECHA" = DATE '2026-04-15';

    IF NOT FOUND THEN
        INSERT INTO "ACTIVIDADES_ESCOLARES" (
            "TIPO_ACTIVIDAD_ID", "TITULO", "DESCRIPCION", "FECHA",
            "FECHA_FIN", "HORA", "UBICACION", "ACTIVO"
        )
        VALUES (
            4, 'Actividad integral de prueba',
            'Actividad creada para validar el flujo integral del sistema.',
            DATE '2026-04-15', DATE '2026-04-15', TIME '10:00', 'Patio central', TRUE
        );
    END IF;
END $$;
