DELETE FROM "ADMIN_AUDIT_LOGS" WHERE "CONTEXTO" LIKE 'brenda.admin@tfs.cl%';
DELETE FROM "ADMIN_AUDIT_LOGS" WHERE "ACCION" IN ('Bloqueo una cuenta', 'Desbloqueo una cuenta', 'Elimino un usuario') AND "CONTEXTO" LIKE 'brenda.admin@tfs.cl%';
DELETE FROM "ADMIN_USER_SETTINGS" WHERE "USUARIO_ID" IN (SELECT "ID" FROM "USUARIOS" WHERE "USUARIO" = 'brenda.admin');
DELETE FROM "USUARIOS" WHERE "USUARIO" = 'brenda.admin';
DELETE FROM "PERSONAS" WHERE "CORREO_ELECTRONICO" = 'brenda.admin@tfs.cl';
