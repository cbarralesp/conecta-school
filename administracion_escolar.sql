CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "ADMIN_ROLES" (
    "ID" BIGSERIAL PRIMARY KEY,
    "CODIGO" VARCHAR(40) NOT NULL UNIQUE,
    "NOMBRE" VARCHAR(80) NOT NULL,
    "DESCRIPCION" VARCHAR(255) NOT NULL,
    "NIVEL_LABEL" VARCHAR(40) NOT NULL,
    "RESUMEN_ALCANCE" VARCHAR(120) NOT NULL,
    "ORDEN_VISUAL" INTEGER NOT NULL DEFAULT 0,
    "ACTIVO" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "ADMIN_ROLE_PERMISSION_SUMMARIES" (
    "ID" BIGSERIAL PRIMARY KEY,
    "ROL_ID" BIGINT NOT NULL REFERENCES "ADMIN_ROLES"("ID") ON DELETE CASCADE,
    "DESCRIPCION" VARCHAR(180) NOT NULL,
    "ESTADO" VARCHAR(20) NOT NULL,
    "ORDEN_VISUAL" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CHK_ADMIN_ROLE_PERMISSION_SUMMARIES_ESTADO"
        CHECK ("ESTADO" IN ('ALLOWED', 'PARTIAL', 'DENIED')),
    CONSTRAINT "UQ_ADMIN_ROLE_PERMISSION_SUMMARIES"
        UNIQUE ("ROL_ID", "DESCRIPCION")
);

CREATE TABLE IF NOT EXISTS "ADMIN_ROLE_MODULE_ACCESS" (
    "ID" BIGSERIAL PRIMARY KEY,
    "ROL_ID" BIGINT NOT NULL REFERENCES "ADMIN_ROLES"("ID") ON DELETE CASCADE,
    "MODULO_CODIGO" VARCHAR(60) NOT NULL,
    "MODULO_NOMBRE" VARCHAR(120) NOT NULL,
    "NIVEL_ACCESO" VARCHAR(20) NOT NULL,
    "ORDEN_VISUAL" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CHK_ADMIN_ROLE_MODULE_ACCESS_NIVEL"
        CHECK ("NIVEL_ACCESO" IN ('FULL', 'READ_ONLY', 'PARTIAL', 'NONE')),
    CONSTRAINT "UQ_ADMIN_ROLE_MODULE_ACCESS"
        UNIQUE ("ROL_ID", "MODULO_CODIGO")
);

CREATE TABLE IF NOT EXISTS "ADMIN_USER_SETTINGS" (
    "ID" BIGSERIAL PRIMARY KEY,
    "USUARIO_ID" BIGINT NOT NULL UNIQUE REFERENCES "USUARIOS"("ID") ON DELETE CASCADE,
    "ROL_ID" BIGINT NOT NULL REFERENCES "ADMIN_ROLES"("ID"),
    "ESTADO" VARCHAR(20) NOT NULL DEFAULT 'Activo',
    "ULTIMO_ACCESO_AT" TIMESTAMP NULL,
    "FORZAR_CAMBIO_CLAVE" BOOLEAN NOT NULL DEFAULT FALSE,
    "REQUIERE_2FA" BOOLEAN NOT NULL DEFAULT FALSE,
    "VIGENCIA_HASTA" DATE NULL,
    "ELIMINABLE" BOOLEAN NOT NULL DEFAULT TRUE,
    "CREADO_AT" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ACTUALIZADO_AT" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CHK_ADMIN_USER_SETTINGS_ESTADO"
        CHECK ("ESTADO" IN ('Activo', 'Bloqueado', 'Inactivo', 'Pendiente'))
);

CREATE TABLE IF NOT EXISTS "ADMIN_AUDIT_LOGS" (
    "ID" BIGSERIAL PRIMARY KEY,
    "USUARIO_ID" BIGINT NULL REFERENCES "USUARIOS"("ID") ON DELETE SET NULL,
    "NOMBRE_USUARIO" VARCHAR(160) NOT NULL,
    "TIPO" VARCHAR(30) NOT NULL,
    "ACCION" VARCHAR(200) NOT NULL,
    "CONTEXTO" VARCHAR(260) NOT NULL,
    "OCURRIDO_AT" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CHK_ADMIN_AUDIT_LOGS_TIPO"
        CHECK ("TIPO" IN ('LOGIN', 'CREATE', 'ROLE_CHANGE', 'BLOCK', 'FAILED_ATTEMPT', 'LOGOUT'))
);

CREATE INDEX IF NOT EXISTS "IDX_ADMIN_USER_SETTINGS_ROL_ID"
    ON "ADMIN_USER_SETTINGS" ("ROL_ID");

CREATE INDEX IF NOT EXISTS "IDX_ADMIN_AUDIT_LOGS_OCURRIDO_AT"
    ON "ADMIN_AUDIT_LOGS" ("OCURRIDO_AT" DESC);

INSERT INTO "ADMIN_ROLES" ("CODIGO", "NOMBRE", "DESCRIPCION", "NIVEL_LABEL", "RESUMEN_ALCANCE", "ORDEN_VISUAL")
VALUES
    ('SUPERADMIN', 'Superadmin', 'Control total del sistema y configuracion global.', 'Nivel 1', 'Acceso total', 1),
    ('DIRECTOR', 'Director', 'Gestion academica integral y supervision general.', 'Nivel 2', 'Gestion total academica', 2),
    ('INSPECTOR', 'Inspector', 'Gestion operativa, convivencia y seguimiento.', 'Nivel 3', 'Gestion de convivencia', 3),
    ('PROFESOR', 'Profesor', 'Gestion de sus cursos asignados y seguimiento docente.', 'Nivel 4', 'Sus cursos asignados', 4),
    ('SECRETARIA', 'Secretaria', 'Gestion administrativa y apoyo a operaciones escolares.', 'Nivel 4', 'Gestion administrativa', 5),
    ('APODERADO', 'Apoderado', 'Consulta de informacion relacionada con sus hijos.', 'Nivel 5', 'Acceso familiar', 6)
ON CONFLICT ("CODIGO") DO UPDATE
SET "NOMBRE" = EXCLUDED."NOMBRE",
    "DESCRIPCION" = EXCLUDED."DESCRIPCION",
    "NIVEL_LABEL" = EXCLUDED."NIVEL_LABEL",
    "RESUMEN_ALCANCE" = EXCLUDED."RESUMEN_ALCANCE",
    "ORDEN_VISUAL" = EXCLUDED."ORDEN_VISUAL",
    "ACTIVO" = TRUE;

DELETE FROM "ADMIN_ROLE_PERMISSION_SUMMARIES";

INSERT INTO "ADMIN_ROLE_PERMISSION_SUMMARIES" ("ROL_ID", "DESCRIPCION", "ESTADO", "ORDEN_VISUAL")
SELECT r."ID", x.descripcion, x.estado, x.orden
FROM "ADMIN_ROLES" r
JOIN (
    VALUES
        ('SUPERADMIN', 'Gestion de usuarios y roles', 'ALLOWED', 1),
        ('SUPERADMIN', 'Configuracion del sistema', 'ALLOWED', 2),
        ('SUPERADMIN', 'Todos los modulos (lectura/escritura)', 'ALLOWED', 3),
        ('SUPERADMIN', 'Auditoria y logs del sistema', 'ALLOWED', 4),

        ('DIRECTOR', 'Todos los modulos academicos', 'ALLOWED', 1),
        ('DIRECTOR', 'Reportes y estadisticas globales', 'ALLOWED', 2),
        ('DIRECTOR', 'Gestion de profesores y cursos', 'ALLOWED', 3),
        ('DIRECTOR', 'Usuarios administrativos', 'PARTIAL', 4),

        ('INSPECTOR', 'Asistencia (todos los cursos)', 'ALLOWED', 1),
        ('INSPECTOR', 'Matriculas (lectura y edicion)', 'ALLOWED', 2),
        ('INSPECTOR', 'Horarios (solo lectura)', 'PARTIAL', 3),
        ('INSPECTOR', 'Sin acceso a calificaciones', 'DENIED', 4),

        ('PROFESOR', 'Asistencia de sus cursos', 'ALLOWED', 1),
        ('PROFESOR', 'Calificaciones de sus asignaturas', 'ALLOWED', 2),
        ('PROFESOR', 'Horario (solo lectura)', 'PARTIAL', 3),
        ('PROFESOR', 'Usuarios y roles', 'DENIED', 4),

        ('SECRETARIA', 'Matriculas completas', 'ALLOWED', 1),
        ('SECRETARIA', 'Calendario de actividades', 'ALLOWED', 2),
        ('SECRETARIA', 'Horario (solo lectura)', 'PARTIAL', 3),
        ('SECRETARIA', 'Calificaciones', 'DENIED', 4),

        ('APODERADO', 'Calificaciones de sus hijos', 'PARTIAL', 1),
        ('APODERADO', 'Asistencia de sus hijos', 'PARTIAL', 2),
        ('APODERADO', 'Horario (solo lectura)', 'PARTIAL', 3),
        ('APODERADO', 'Datos docentes del sistema', 'DENIED', 4)
) AS x(codigo_rol, descripcion, estado, orden)
    ON x.codigo_rol = r."CODIGO";

DELETE FROM "ADMIN_ROLE_MODULE_ACCESS";

INSERT INTO "ADMIN_ROLE_MODULE_ACCESS" ("ROL_ID", "MODULO_CODIGO", "MODULO_NOMBRE", "NIVEL_ACCESO", "ORDEN_VISUAL")
SELECT r."ID", x.modulo_codigo, x.modulo_nombre, x.nivel, x.orden
FROM "ADMIN_ROLES" r
JOIN (
    VALUES
        ('SUPERADMIN', 'ENROLLMENTS', 'Matriculas', 'FULL', 1),
        ('DIRECTOR', 'ENROLLMENTS', 'Matriculas', 'FULL', 1),
        ('INSPECTOR', 'ENROLLMENTS', 'Matriculas', 'READ_ONLY', 1),
        ('PROFESOR', 'ENROLLMENTS', 'Matriculas', 'NONE', 1),
        ('SECRETARIA', 'ENROLLMENTS', 'Matriculas', 'FULL', 1),
        ('APODERADO', 'ENROLLMENTS', 'Matriculas', 'NONE', 1),

        ('SUPERADMIN', 'TEACHERS', 'Profesores', 'FULL', 2),
        ('DIRECTOR', 'TEACHERS', 'Profesores', 'FULL', 2),
        ('INSPECTOR', 'TEACHERS', 'Profesores', 'READ_ONLY', 2),
        ('PROFESOR', 'TEACHERS', 'Profesores', 'NONE', 2),
        ('SECRETARIA', 'TEACHERS', 'Profesores', 'READ_ONLY', 2),
        ('APODERADO', 'TEACHERS', 'Profesores', 'NONE', 2),

        ('SUPERADMIN', 'SCHEDULE', 'Horario', 'FULL', 3),
        ('DIRECTOR', 'SCHEDULE', 'Horario', 'FULL', 3),
        ('INSPECTOR', 'SCHEDULE', 'Horario', 'READ_ONLY', 3),
        ('PROFESOR', 'SCHEDULE', 'Horario', 'READ_ONLY', 3),
        ('SECRETARIA', 'SCHEDULE', 'Horario', 'READ_ONLY', 3),
        ('APODERADO', 'SCHEDULE', 'Horario', 'READ_ONLY', 3),

        ('SUPERADMIN', 'ATTENDANCE', 'Asistencia', 'FULL', 4),
        ('DIRECTOR', 'ATTENDANCE', 'Asistencia', 'FULL', 4),
        ('INSPECTOR', 'ATTENDANCE', 'Asistencia', 'FULL', 4),
        ('PROFESOR', 'ATTENDANCE', 'Asistencia', 'PARTIAL', 4),
        ('SECRETARIA', 'ATTENDANCE', 'Asistencia', 'NONE', 4),
        ('APODERADO', 'ATTENDANCE', 'Asistencia', 'PARTIAL', 4),

        ('SUPERADMIN', 'GRADES', 'Calificaciones', 'FULL', 5),
        ('DIRECTOR', 'GRADES', 'Calificaciones', 'FULL', 5),
        ('INSPECTOR', 'GRADES', 'Calificaciones', 'NONE', 5),
        ('PROFESOR', 'GRADES', 'Calificaciones', 'PARTIAL', 5),
        ('SECRETARIA', 'GRADES', 'Calificaciones', 'NONE', 5),
        ('APODERADO', 'GRADES', 'Calificaciones', 'PARTIAL', 5),

        ('SUPERADMIN', 'CALENDAR', 'Calendario', 'FULL', 6),
        ('DIRECTOR', 'CALENDAR', 'Calendario', 'FULL', 6),
        ('INSPECTOR', 'CALENDAR', 'Calendario', 'FULL', 6),
        ('PROFESOR', 'CALENDAR', 'Calendario', 'READ_ONLY', 6),
        ('SECRETARIA', 'CALENDAR', 'Calendario', 'FULL', 6),
        ('APODERADO', 'CALENDAR', 'Calendario', 'READ_ONLY', 6),

        ('SUPERADMIN', 'ADMIN_USERS', 'Usuarios/Roles', 'FULL', 7),
        ('DIRECTOR', 'ADMIN_USERS', 'Usuarios/Roles', 'NONE', 7),
        ('INSPECTOR', 'ADMIN_USERS', 'Usuarios/Roles', 'NONE', 7),
        ('PROFESOR', 'ADMIN_USERS', 'Usuarios/Roles', 'NONE', 7),
        ('SECRETARIA', 'ADMIN_USERS', 'Usuarios/Roles', 'NONE', 7),
        ('APODERADO', 'ADMIN_USERS', 'Usuarios/Roles', 'NONE', 7),

        ('SUPERADMIN', 'AUDIT', 'Auditoria', 'FULL', 8),
        ('DIRECTOR', 'AUDIT', 'Auditoria', 'READ_ONLY', 8),
        ('INSPECTOR', 'AUDIT', 'Auditoria', 'NONE', 8),
        ('PROFESOR', 'AUDIT', 'Auditoria', 'NONE', 8),
        ('SECRETARIA', 'AUDIT', 'Auditoria', 'NONE', 8),
        ('APODERADO', 'AUDIT', 'Auditoria', 'NONE', 8),

        ('SUPERADMIN', 'SETTINGS', 'Configuracion', 'FULL', 9),
        ('DIRECTOR', 'SETTINGS', 'Configuracion', 'NONE', 9),
        ('INSPECTOR', 'SETTINGS', 'Configuracion', 'NONE', 9),
        ('PROFESOR', 'SETTINGS', 'Configuracion', 'NONE', 9),
        ('SECRETARIA', 'SETTINGS', 'Configuracion', 'NONE', 9),
        ('APODERADO', 'SETTINGS', 'Configuracion', 'NONE', 9)
) AS x(codigo_rol, modulo_codigo, modulo_nombre, nivel, orden)
    ON x.codigo_rol = r."CODIGO";

DO $$
DECLARE
    person_id BIGINT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "PERSONAS" WHERE "CORREO_ELECTRONICO" = 'director@tfs.cl') THEN
        INSERT INTO "PERSONAS" ("RUN", "NOMBRES", "APELLIDOS", "CORREO_ELECTRONICO", "TELEFONO", "DIRECCION", "FECHA_NACIMIENTO", "GENERO")
        VALUES ('18.111.111-1', 'Marco', 'Ramirez Vera', 'director@tfs.cl', '+56 9 5555 1002', 'Av. Central 120, Buin', DATE '1981-03-14', 'Masculino');
    END IF;

    SELECT "ID" INTO person_id
    FROM "PERSONAS"
    WHERE "CORREO_ELECTRONICO" = 'director@tfs.cl';

    IF NOT EXISTS (SELECT 1 FROM "USUARIOS" WHERE "USUARIO" = 'mramirez') THEN
        INSERT INTO "USUARIOS" ("PERSONA_ID", "USUARIO", "CLAVE", "ACTIVO")
        VALUES (person_id, 'mramirez', crypt('mramirez123', gen_salt('bf', 10)), TRUE);
    END IF;
END $$;

DO $$
DECLARE
    person_id BIGINT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "PERSONAS" WHERE "CORREO_ELECTRONICO" = 'inspector@tfs.cl') THEN
        INSERT INTO "PERSONAS" ("RUN", "NOMBRES", "APELLIDOS", "CORREO_ELECTRONICO", "TELEFONO", "DIRECCION", "FECHA_NACIMIENTO", "GENERO")
        VALUES ('19.222.222-2', 'Laura', 'Flores Morales', 'inspector@tfs.cl', '+56 9 5555 1003', 'Calle Norte 45, Buin', DATE '1986-07-21', 'Femenino');
    END IF;

    SELECT "ID" INTO person_id
    FROM "PERSONAS"
    WHERE "CORREO_ELECTRONICO" = 'inspector@tfs.cl';

    IF NOT EXISTS (SELECT 1 FROM "USUARIOS" WHERE "USUARIO" = 'lflores') THEN
        INSERT INTO "USUARIOS" ("PERSONA_ID", "USUARIO", "CLAVE", "ACTIVO")
        VALUES (person_id, 'lflores', crypt('lflores123', gen_salt('bf', 10)), TRUE);
    END IF;
END $$;

DO $$
DECLARE
    person_id BIGINT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "PERSONAS" WHERE "CORREO_ELECTRONICO" = 'secretaria@tfs.cl') THEN
        INSERT INTO "PERSONAS" ("RUN", "NOMBRES", "APELLIDOS", "CORREO_ELECTRONICO", "TELEFONO", "DIRECCION", "FECHA_NACIMIENTO", "GENERO")
        VALUES ('20.333.333-3', 'Patricia', 'Soto Araya', 'secretaria@tfs.cl', '+56 9 5555 1004', 'Av. Los Naranjos 300, Buin', DATE '1989-11-08', 'Femenino');
    END IF;

    SELECT "ID" INTO person_id
    FROM "PERSONAS"
    WHERE "CORREO_ELECTRONICO" = 'secretaria@tfs.cl';

    IF NOT EXISTS (SELECT 1 FROM "USUARIOS" WHERE "USUARIO" = 'psoto') THEN
        INSERT INTO "USUARIOS" ("PERSONA_ID", "USUARIO", "CLAVE", "ACTIVO")
        VALUES (person_id, 'psoto', crypt('psoto123', gen_salt('bf', 10)), TRUE);
    END IF;
END $$;

DO $$
DECLARE
    person_id BIGINT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "PERSONAS" WHERE "CORREO_ELECTRONICO" = 'apoderado1@tfs.cl') THEN
        INSERT INTO "PERSONAS" ("RUN", "NOMBRES", "APELLIDOS", "CORREO_ELECTRONICO", "TELEFONO", "DIRECCION", "FECHA_NACIMIENTO", "GENERO")
        VALUES ('21.444.444-4', 'Valentina', 'Fuentes Herrera', 'apoderado1@tfs.cl', '+56 9 5555 1005', 'Pasaje Los Boldos 19, Buin', DATE '1991-05-17', 'Femenino');
    END IF;

    SELECT "ID" INTO person_id
    FROM "PERSONAS"
    WHERE "CORREO_ELECTRONICO" = 'apoderado1@tfs.cl';

    IF NOT EXISTS (SELECT 1 FROM "USUARIOS" WHERE "USUARIO" = 'vfuentes') THEN
        INSERT INTO "USUARIOS" ("PERSONA_ID", "USUARIO", "CLAVE", "ACTIVO")
        VALUES (person_id, 'vfuentes', crypt('vfuentes123', gen_salt('bf', 10)), TRUE);
    END IF;
END $$;

DO $$
DECLARE
    person_id BIGINT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "PERSONAS" WHERE "CORREO_ELECTRONICO" = 'jvera@tfs.cl') THEN
        INSERT INTO "PERSONAS" ("RUN", "NOMBRES", "APELLIDOS", "CORREO_ELECTRONICO", "TELEFONO", "DIRECCION", "FECHA_NACIMIENTO", "GENERO")
        VALUES ('17.777.777-7', 'Javiera', 'Vera Campos', 'jvera@tfs.cl', '+56 9 5555 1006', 'Sector Santa Rosa 88, Buin', DATE '1990-09-12', 'Femenino');
    END IF;

    SELECT "ID" INTO person_id
    FROM "PERSONAS"
    WHERE "CORREO_ELECTRONICO" = 'jvera@tfs.cl';

    IF NOT EXISTS (SELECT 1 FROM "USUARIOS" WHERE "USUARIO" = 'jvera') THEN
        INSERT INTO "USUARIOS" ("PERSONA_ID", "USUARIO", "CLAVE", "ACTIVO")
        VALUES (person_id, 'jvera', crypt('jvera123', gen_salt('bf', 10)), TRUE);
    END IF;
END $$;

INSERT INTO "ADMIN_USER_SETTINGS" ("USUARIO_ID", "ROL_ID", "ESTADO", "ULTIMO_ACCESO_AT", "FORZAR_CAMBIO_CLAVE", "REQUIERE_2FA", "VIGENCIA_HASTA", "ELIMINABLE")
SELECT
    u."ID",
    r."ID",
    CASE
        WHEN u."USUARIO" = 'jvera' THEN 'Bloqueado'
        WHEN u."ACTIVO" = FALSE THEN 'Inactivo'
        ELSE 'Activo'
    END,
    CASE u."USUARIO"
        WHEN 'nramirez' THEN TIMESTAMP '2026-04-05 09:14:00'
        WHEN 'mramirez' THEN TIMESTAMP '2026-04-05 08:32:00'
        WHEN 'lflores' THEN TIMESTAMP '2026-04-05 08:45:00'
        WHEN 'psoto' THEN TIMESTAMP '2026-04-04 17:20:00'
        WHEN 'mgonzalez' THEN TIMESTAMP '2026-04-05 08:52:00'
        WHEN 'jvera' THEN TIMESTAMP '2026-04-04 07:58:00'
        WHEN 'vfuentes' THEN TIMESTAMP '2026-04-03 19:30:00'
        WHEN 'pprueba' THEN TIMESTAMP '2026-04-05 07:40:00'
        ELSE NULL
    END,
    CASE WHEN u."USUARIO" = 'jvera' THEN TRUE ELSE FALSE END,
    CASE WHEN u."USUARIO" IN ('nramirez', 'mramirez') THEN TRUE ELSE FALSE END,
    NULL,
    CASE WHEN u."USUARIO" IN ('nramirez', 'mramirez') THEN FALSE ELSE TRUE END
FROM "USUARIOS" u
JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
JOIN "ADMIN_ROLES" r
  ON r."CODIGO" = CASE
        WHEN u."USUARIO" = 'nramirez' THEN 'SUPERADMIN'
        WHEN u."USUARIO" = 'mramirez' THEN 'DIRECTOR'
        WHEN u."USUARIO" = 'lflores' THEN 'INSPECTOR'
        WHEN u."USUARIO" = 'psoto' THEN 'SECRETARIA'
        WHEN u."USUARIO" = 'vfuentes' THEN 'APODERADO'
        ELSE 'PROFESOR'
     END
WHERE NOT EXISTS (
    SELECT 1
    FROM "ADMIN_USER_SETTINGS" aus
    WHERE aus."USUARIO_ID" = u."ID"
);

UPDATE "ADMIN_USER_SETTINGS" aus
SET "ROL_ID" = r."ID",
    "ESTADO" = CASE
        WHEN u."USUARIO" = 'jvera' THEN 'Bloqueado'
        WHEN u."ACTIVO" = FALSE THEN 'Inactivo'
        ELSE aus."ESTADO"
    END,
    "REQUIERE_2FA" = CASE WHEN u."USUARIO" IN ('nramirez', 'mramirez') THEN TRUE ELSE aus."REQUIERE_2FA" END
FROM "USUARIOS" u
JOIN "ADMIN_ROLES" r
  ON r."CODIGO" = CASE
        WHEN u."USUARIO" = 'nramirez' THEN 'SUPERADMIN'
        WHEN u."USUARIO" = 'mramirez' THEN 'DIRECTOR'
        WHEN u."USUARIO" = 'lflores' THEN 'INSPECTOR'
        WHEN u."USUARIO" = 'psoto' THEN 'SECRETARIA'
        WHEN u."USUARIO" = 'vfuentes' THEN 'APODERADO'
        ELSE 'PROFESOR'
     END
WHERE aus."USUARIO_ID" = u."ID";

INSERT INTO "ADMIN_AUDIT_LOGS" ("USUARIO_ID", "NOMBRE_USUARIO", "TIPO", "ACCION", "CONTEXTO", "OCURRIDO_AT")
SELECT u."ID", x.nombre_usuario, x.tipo, x.accion, x.contexto, x.ocurrido_at
FROM (
    VALUES
        ('nramirez', 'Sistema Admin', 'LOGIN', 'Inicio sesion desde 192.168.1.10', 'Acceso administrativo correcto', TIMESTAMP '2026-04-05 09:14:00'),
        ('nramirez', 'Sistema Admin', 'CREATE', 'Creo usuario mgonzalez@tfs.cl', 'Rol asignado: Profesor', TIMESTAMP '2026-04-05 08:52:00'),
        ('nramirez', 'Sistema Admin', 'ROLE_CHANGE', 'Cambio de rol para jvera@tfs.cl', 'Profesor -> Bloqueado', TIMESTAMP '2026-04-05 08:40:00'),
        ('nramirez', 'Sistema Admin', 'BLOCK', 'Bloqueo una cuenta por inactividad', 'Cuenta jvera@tfs.cl', TIMESTAMP '2026-04-04 16:55:00'),
        ('nramirez', 'Sistema Admin', 'FAILED_ATTEMPT', 'Intento de acceso fallido', '3 intentos para externo@mail.com', TIMESTAMP '2026-04-04 09:00:00'),
        ('psoto', 'Patricia Soto', 'LOGOUT', 'Cerro sesion', 'Salida manual del panel', TIMESTAMP '2026-04-04 17:20:00')
) AS x(usuario, nombre_usuario, tipo, accion, contexto, ocurrido_at)
JOIN "USUARIOS" u ON u."USUARIO" = x.usuario
WHERE NOT EXISTS (
    SELECT 1
    FROM "ADMIN_AUDIT_LOGS" a
    WHERE a."TIPO" = x.tipo
      AND a."ACCION" = x.accion
      AND a."OCURRIDO_AT" = x.ocurrido_at
);
