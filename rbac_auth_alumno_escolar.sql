DO $$
DECLARE
    alumno_role_id BIGINT;
    person_id BIGINT;
    user_id BIGINT;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "ADMIN_ROLES"
        WHERE UPPER("CODIGO") = 'ALUMNO'
    ) THEN
        INSERT INTO "ADMIN_ROLES" (
            "CODIGO",
            "NOMBRE",
            "DESCRIPCION",
            "NIVEL_LABEL",
            "RESUMEN_ALCANCE",
            "ORDEN_VISUAL",
            "ACTIVO"
        )
        VALUES (
            'ALUMNO',
            'Alumno',
            'Usuario estudiante con acceso a su informacion academica.',
            'Nivel 6',
            'Visualizacion personal de cursos, horario, asistencia y calificaciones.',
            7,
            TRUE
        );
    END IF;

    SELECT "ID" INTO alumno_role_id
    FROM "ADMIN_ROLES"
    WHERE UPPER("CODIGO") = 'ALUMNO';

    DELETE FROM "ADMIN_ROLE_PERMISSION_SUMMARIES"
    WHERE "ROL_ID" = alumno_role_id;

    INSERT INTO "ADMIN_ROLE_PERMISSION_SUMMARIES" ("ROL_ID", "DESCRIPCION", "ESTADO", "ORDEN_VISUAL")
    VALUES
        (alumno_role_id, 'Dashboard personal con resumen academico', 'ALLOWED', 1),
        (alumno_role_id, 'Horario y cursos matriculados', 'ALLOWED', 2),
        (alumno_role_id, 'Calificaciones y asistencia propias', 'PARTIAL', 3),
        (alumno_role_id, 'Sin acceso a gestion administrativa', 'DENIED', 4);

    DELETE FROM "ADMIN_ROLE_MODULE_ACCESS"
    WHERE "ROL_ID" = alumno_role_id;

    INSERT INTO "ADMIN_ROLE_MODULE_ACCESS" ("ROL_ID", "MODULO_CODIGO", "MODULO_NOMBRE", "NIVEL_ACCESO", "ORDEN_VISUAL")
    VALUES
        (alumno_role_id, 'MATRICULAS', 'Matriculas', 'NONE', 1),
        (alumno_role_id, 'PROFESORES', 'Profesores', 'NONE', 2),
        (alumno_role_id, 'HORARIO', 'Horario', 'READ_ONLY', 3),
        (alumno_role_id, 'ASISTENCIA', 'Asistencia', 'PARTIAL', 4),
        (alumno_role_id, 'CALIFICACIONES', 'Calificaciones', 'PARTIAL', 5),
        (alumno_role_id, 'CALENDARIO', 'Calendario', 'READ_ONLY', 6),
        (alumno_role_id, 'USUARIOS_ROLES', 'Usuarios/Roles', 'NONE', 7),
        (alumno_role_id, 'AUDITORIA', 'Auditoria', 'NONE', 8),
        (alumno_role_id, 'CONFIGURACION', 'Configuracion', 'NONE', 9);

    SELECT "ID" INTO person_id
    FROM "PERSONAS"
    WHERE UPPER("RUN") = UPPER('33.333.333-3')
    LIMIT 1;

    IF person_id IS NULL THEN
        INSERT INTO "PERSONAS" (
            "RUN",
            "NOMBRES",
            "APELLIDOS",
            "CORREO_ELECTRONICO",
            "TELEFONO",
            "DIRECCION"
        )
        VALUES (
            '33.333.333-3',
            'Bruno',
            'Prueba Alumno',
            'bruno.prueba@tfs.cl',
            '+56 9 5555 0001',
            'Direccion de prueba'
        )
        RETURNING "ID" INTO person_id;
    ELSE
        UPDATE "PERSONAS"
        SET
            "NOMBRES" = 'Bruno',
            "APELLIDOS" = 'Prueba Alumno',
            "CORREO_ELECTRONICO" = 'bruno.prueba@tfs.cl',
            "TELEFONO" = '+56 9 5555 0001'
        WHERE "ID" = person_id;
    END IF;

    SELECT "ID" INTO user_id
    FROM "USUARIOS"
    WHERE UPPER("USUARIO") = UPPER('bprueba')
    LIMIT 1;

    IF user_id IS NULL THEN
        INSERT INTO "USUARIOS" (
            "PERSONA_ID",
            "USUARIO",
            "CLAVE",
            "ACTIVO"
        )
        VALUES (
            person_id,
            'bprueba',
            (SELECT "CLAVE" FROM "USUARIOS" WHERE UPPER("USUARIO") = UPPER('nramirez') LIMIT 1),
            TRUE
        )
        RETURNING "ID" INTO user_id;
    ELSE
        UPDATE "USUARIOS"
        SET
            "PERSONA_ID" = person_id,
            "CLAVE" = (SELECT "CLAVE" FROM "USUARIOS" WHERE UPPER("USUARIO") = UPPER('nramirez') LIMIT 1),
            "ACTIVO" = TRUE
        WHERE "ID" = user_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM "ADMIN_USER_SETTINGS"
        WHERE "USUARIO_ID" = user_id
    ) THEN
        INSERT INTO "ADMIN_USER_SETTINGS" (
            "USUARIO_ID",
            "ROL_ID",
            "ESTADO",
            "FORZAR_CAMBIO_CLAVE",
            "REQUIERE_2FA",
            "VIGENCIA_HASTA",
            "ELIMINABLE"
        )
        VALUES (
            user_id,
            alumno_role_id,
            'Activo',
            FALSE,
            FALSE,
            NULL,
            TRUE
        );
    ELSE
        UPDATE "ADMIN_USER_SETTINGS"
        SET
            "ROL_ID" = alumno_role_id,
            "ESTADO" = 'Activo',
            "FORZAR_CAMBIO_CLAVE" = FALSE,
            "REQUIERE_2FA" = FALSE,
            "VIGENCIA_HASTA" = NULL,
            "ACTUALIZADO_AT" = CURRENT_TIMESTAMP
        WHERE "USUARIO_ID" = user_id;
    END IF;

    INSERT INTO "ADMIN_AUDIT_LOGS" (
        "USUARIO_ID",
        "NOMBRE_USUARIO",
        "TIPO",
        "ACCION",
        "CONTEXTO",
        "OCURRIDO_AT"
    )
    VALUES (
        user_id,
        'Bruno Prueba Alumno',
        'CREATE',
        'Provision de cuenta alumno',
        'Cuenta inicial para flujo RBAC y portal estudiante',
        CURRENT_TIMESTAMP
    );
END $$;
