DO $$
DECLARE
    person_id BIGINT;
    role_id BIGINT;
    source_password TEXT;
    user_id BIGINT;
BEGIN
    SELECT "ID"
    INTO role_id
    FROM "ADMIN_ROLES"
    WHERE "CODIGO" = 'SUPERADMIN';

    IF role_id IS NULL THEN
        RAISE EXCEPTION 'No existe el rol SUPERADMIN en ADMIN_ROLES';
    END IF;

    SELECT "CLAVE"
    INTO source_password
    FROM "USUARIOS"
    WHERE "USUARIO" = 'nramirez';

    IF source_password IS NULL THEN
        RAISE EXCEPTION 'No existe el usuario base nramirez para reutilizar hash';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM "PERSONAS"
        WHERE UPPER("CORREO_ELECTRONICO") = UPPER('superadmin.respaldo@tfs.cl')
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
            '24.999.999-9',
            'Superadmin',
            'Respaldo TFS',
            'superadmin.respaldo@tfs.cl',
            '+56 9 5555 9000',
            'Administracion central',
            DATE '1985-01-10',
            'Masculino'
        );
    END IF;

    SELECT "ID"
    INTO person_id
    FROM "PERSONAS"
    WHERE UPPER("CORREO_ELECTRONICO") = UPPER('superadmin.respaldo@tfs.cl');

    IF NOT EXISTS (
        SELECT 1
        FROM "USUARIOS"
        WHERE UPPER("USUARIO") = UPPER('superadmin')
    ) THEN
        INSERT INTO "USUARIOS" ("PERSONA_ID", "USUARIO", "CLAVE", "ACTIVO")
        VALUES (person_id, 'superadmin', source_password, TRUE);
    ELSE
        UPDATE "USUARIOS"
        SET "PERSONA_ID" = person_id,
            "CLAVE" = source_password,
            "ACTIVO" = TRUE
        WHERE UPPER("USUARIO") = UPPER('superadmin');
    END IF;

    SELECT "ID"
    INTO user_id
    FROM "USUARIOS"
    WHERE UPPER("USUARIO") = UPPER('superadmin');

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
        'Superadmin Respaldo TFS',
        'CREATE',
        'Provision de cuenta superadmin de respaldo',
        'Usuario superadmin creado para acceso total de respaldo'
    );
END $$;
