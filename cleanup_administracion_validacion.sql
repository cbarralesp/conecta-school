DELETE FROM "ADMIN_AUDIT_LOGS"
WHERE "CONTEXTO" LIKE 'claudia.control@tfs.cl%'
   OR "ACCION" IN ('Creo un nuevo usuario', 'Bloqueo una cuenta', 'Desbloqueo una cuenta', 'Elimino un usuario')
      AND "CONTEXTO" LIKE 'claudia.control@tfs.cl%';

DELETE FROM "ADMIN_USER_SETTINGS"
WHERE "USUARIO_ID" IN (
    SELECT "ID"
    FROM "USUARIOS"
    WHERE "USUARIO" = 'claudia.control'
       OR "USUARIO" = 'claudia.control@tfs.cl'
);

DELETE FROM "USUARIOS"
WHERE "USUARIO" = 'claudia.control'
   OR "USUARIO" = 'claudia.control@tfs.cl';

DELETE FROM "PERSONAS"
WHERE "CORREO_ELECTRONICO" = 'claudia.control@tfs.cl';
