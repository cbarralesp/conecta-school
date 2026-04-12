CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    person_id BIGINT;
    user_id BIGINT;
    role_id BIGINT;
BEGIN
    SELECT "ID"
    INTO role_id
    FROM "ADMIN_ROLES"
    WHERE "CODIGO" = 'ALUMNO';

    IF role_id IS NULL THEN
        RAISE EXCEPTION 'No existe el rol ALUMNO';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM "PERSONAS"
        WHERE UPPER("RUN") = UPPER('26.890.123-4')
    ) THEN
        INSERT INTO "PERSONAS" (
            "RUN",
            "NOMBRES",
            "APELLIDOS",
            "CORREO_ELECTRONICO",
            "TELEFONO",
            "DIRECCION",
            "FECHA_NACIMIENTO",
            "GENERO"
        )
        VALUES (
            '26.890.123-4',
            'Mateo',
            'Herrera Castillo',
            'mateo.herrera@tfs.cl',
            '+56 9 5555 2604',
            'Pasaje Escolar 204',
            DATE '2018-02-14',
            'Masculino'
        );
    ELSE
        UPDATE "PERSONAS"
        SET "NOMBRES" = 'Mateo',
            "APELLIDOS" = 'Herrera Castillo',
            "CORREO_ELECTRONICO" = COALESCE(NULLIF("CORREO_ELECTRONICO", ''), 'mateo.herrera@tfs.cl'),
            "TELEFONO" = COALESCE(NULLIF("TELEFONO", ''), '+56 9 5555 2604'),
            "DIRECCION" = COALESCE(NULLIF("DIRECCION", ''), 'Pasaje Escolar 204'),
            "FECHA_NACIMIENTO" = COALESCE("FECHA_NACIMIENTO", DATE '2018-02-14'),
            "GENERO" = COALESCE(NULLIF("GENERO", ''), 'Masculino')
        WHERE UPPER("RUN") = UPPER('26.890.123-4');
    END IF;

    SELECT "ID"
    INTO person_id
    FROM "PERSONAS"
    WHERE UPPER("RUN") = UPPER('26.890.123-4');

    IF NOT EXISTS (
        SELECT 1
        FROM "USUARIOS"
        WHERE UPPER("USUARIO") = UPPER('mherrera')
    ) THEN
        INSERT INTO "USUARIOS" ("PERSONA_ID", "USUARIO", "CLAVE", "ACTIVO")
        VALUES (
            person_id,
            'mherrera',
            crypt('mherrera123', gen_salt('bf', 10)),
            TRUE
        );
    ELSE
        UPDATE "USUARIOS"
        SET "PERSONA_ID" = person_id,
            "CLAVE" = crypt('mherrera123', gen_salt('bf', 10)),
            "ACTIVO" = TRUE
        WHERE UPPER("USUARIO") = UPPER('mherrera');
    END IF;

    SELECT "ID"
    INTO user_id
    FROM "USUARIOS"
    WHERE UPPER("USUARIO") = UPPER('mherrera');

    INSERT INTO "ADMIN_USER_SETTINGS" (
        "USUARIO_ID",
        "ROL_ID",
        "ESTADO",
        "ULTIMO_ACCESO_AT",
        "FORZAR_CAMBIO_CLAVE",
        "REQUIERE_2FA",
        "ELIMINABLE"
    )
    VALUES (
        user_id,
        role_id,
        'Activo',
        NULL,
        FALSE,
        FALSE,
        TRUE
    )
    ON CONFLICT ("USUARIO_ID") DO UPDATE
    SET "ROL_ID" = EXCLUDED."ROL_ID",
        "ESTADO" = 'Activo',
        "ACTUALIZADO_AT" = CURRENT_TIMESTAMP;

    INSERT INTO "ADMIN_AUDIT_LOGS" (
        "USUARIO_ID",
        "NOMBRE_USUARIO",
        "TIPO",
        "ACCION",
        "CONTEXTO"
    )
    VALUES (
        user_id,
        'Mateo Herrera Castillo',
        'CREATE',
        'Provision de cuenta alumno real',
        'Cuenta creada para alumno real con matricula activa'
    );
END $$;
