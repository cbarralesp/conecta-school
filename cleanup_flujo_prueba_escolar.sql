DO $$
DECLARE
    v_teacher_person_id BIGINT;
    v_teacher_id BIGINT;
    v_student_id BIGINT;
    v_subject_id BIGINT;
    v_record_id BIGINT;
BEGIN
    SELECT "ID" INTO v_teacher_person_id
    FROM "PERSONAS"
    WHERE "RUN" = '22.222.222-2'
    LIMIT 1;

    SELECT "ID" INTO v_teacher_id
    FROM "PROFESORES"
    WHERE "PERSONA_ID" = v_teacher_person_id
    LIMIT 1;

    SELECT "ID" INTO v_student_id
    FROM "ALUMNOS"
    WHERE "RUN" = '33.333.333-3'
    LIMIT 1;

    SELECT "ID" INTO v_subject_id
    FROM "ASIGNATURAS"
    WHERE "CODIGO" = 'PRB'
    LIMIT 1;

    IF v_teacher_id IS NOT NULL THEN
        DELETE FROM "CURSO_DOCENTES"
        WHERE "PROFESOR_ID" = v_teacher_id
           OR "ASISTENTE_ID" = v_teacher_id;

        DELETE FROM "HORARIOS_CARGAS"
        WHERE "CARGA_DOCENTE_ID" IN (
            SELECT "ID"
            FROM "CARGAS_DOCENTES"
            WHERE "PROFESOR_ID" = v_teacher_id
        );

        DELETE FROM "CARGAS_DOCENTES"
        WHERE "PROFESOR_ID" = v_teacher_id;

        DELETE FROM "PROFESOR_CONTACTOS_EMERGENCIA"
        WHERE "PROFESOR_ID" = v_teacher_id;

        DELETE FROM "PROFESOR_ASIGNATURAS"
        WHERE "PROFESOR_ID" = v_teacher_id
           OR "ASIGNATURA_ID" = v_subject_id
           OR "ASIGNATURA" = 'Taller de Prueba';
    END IF;

    IF v_student_id IS NOT NULL THEN
        DELETE FROM "CALIFICACIONES"
        WHERE "ALUMNO_ID" = v_student_id;

        DELETE FROM "ASISTENCIA_DETALLES"
        WHERE "ALUMNO_ID" = v_student_id;

        DELETE FROM "MATRICULA_RETIRO_RESPONSABLES"
        WHERE "MATRICULA_ID" IN (
            SELECT "ID" FROM "MATRICULAS" WHERE "ALUMNO_ID" = v_student_id
        );

        DELETE FROM "MATRICULA_APODERADOS"
        WHERE "MATRICULA_ID" IN (
            SELECT "ID" FROM "MATRICULAS" WHERE "ALUMNO_ID" = v_student_id
        );

        DELETE FROM "MATRICULAS"
        WHERE "ALUMNO_ID" = v_student_id;

        DELETE FROM "CURSO_ALUMNOS"
        WHERE "ALUMNO_ID" = v_student_id;
    END IF;

    IF v_subject_id IS NOT NULL THEN
        DELETE FROM "CALIFICACIONES"
        WHERE "EVALUACION_ID" IN (
            SELECT "ID" FROM "EVALUACIONES" WHERE "ASIGNATURA_ID" = v_subject_id
        );

        DELETE FROM "EVALUACIONES"
        WHERE "ASIGNATURA_ID" = v_subject_id;

        DELETE FROM "CURSO_ASIGNATURAS"
        WHERE "ASIGNATURA_ID" = v_subject_id;
    END IF;

    DELETE FROM "ACTIVIDADES_ESCOLARES"
    WHERE "TITULO" = 'Actividad integral de prueba';

    DELETE FROM "ASIGNACIONES"
    WHERE "PROFESOR_PERSONA_ID" = v_teacher_person_id;

    DELETE FROM "CURSOS"
    WHERE "CODIGO" IN ('4A-2026', '4B-2026', 'CUR-4A-2026', 'CUR-4B-2026')
       OR ("NOMBRE" IN ('Cuarto Basico A', 'Cuarto Basico B') AND "CODIGO" LIKE '%4A-2026')
       OR ("NOMBRE" IN ('Cuarto Basico A', 'Cuarto Basico B') AND "CODIGO" LIKE '%4B-2026');

    DELETE FROM "ASISTENCIA_REGISTROS"
    WHERE NOT EXISTS (
        SELECT 1
        FROM "ASISTENCIA_DETALLES" d
        WHERE d."REGISTRO_ID" = "ASISTENCIA_REGISTROS"."ID"
    );

    DELETE FROM "USUARIOS"
    WHERE "USUARIO" = 'pprueba'
       OR "PERSONA_ID" = v_teacher_person_id;

    DELETE FROM "PROFESORES"
    WHERE "ID" = v_teacher_id;

    DELETE FROM "PERSONAS"
    WHERE "ID" = v_teacher_person_id;

    DELETE FROM "ALUMNOS"
    WHERE "ID" = v_student_id;

    DELETE FROM "ASIGNATURAS"
    WHERE "ID" = v_subject_id;
END $$;
