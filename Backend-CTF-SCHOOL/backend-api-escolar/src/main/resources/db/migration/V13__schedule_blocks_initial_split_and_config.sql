DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "BLOQUES_HORARIOS"
        WHERE "ACTIVO" = TRUE
          AND "ORDEN" = 1
          AND "HORA_INICIO" = TIME '08:30:00'
          AND "HORA_FIN" = TIME '09:15:00'
    ) AND NOT EXISTS (
        SELECT 1
        FROM "BLOQUES_HORARIOS"
        WHERE "ACTIVO" = TRUE
          AND "ORDEN" = 2
          AND "HORA_INICIO" = TIME '08:45:00'
          AND "HORA_FIN" = TIME '09:15:00'
    ) THEN
        UPDATE "BLOQUES_HORARIOS"
        SET "ORDEN" = "ORDEN" + 100
        WHERE "ORDEN" >= 2;

        UPDATE "BLOQUES_HORARIOS"
        SET "ORDEN" = "ORDEN" - 99
        WHERE "ORDEN" >= 102;

        UPDATE "BLOQUES_HORARIOS"
        SET "HORA_FIN" = TIME '08:45:00'
        WHERE "ACTIVO" = TRUE
          AND "ORDEN" = 1;

        INSERT INTO "BLOQUES_HORARIOS" ("DIA_SEMANA", "HORA_INICIO", "HORA_FIN", "ORDEN", "TIPO_BLOQUE", "ACTIVO")
        VALUES
            ('LUNES', TIME '08:45:00', TIME '09:15:00', 2, 'CLASE', TRUE),
            ('MARTES', TIME '08:45:00', TIME '09:15:00', 2, 'CLASE', TRUE),
            ('MIERCOLES', TIME '08:45:00', TIME '09:15:00', 2, 'CLASE', TRUE),
            ('JUEVES', TIME '08:45:00', TIME '09:15:00', 2, 'CLASE', TRUE),
            ('VIERNES', TIME '08:45:00', TIME '09:15:00', 2, 'CLASE', TRUE);
    END IF;
END $$;
