DELETE FROM "PEDAGOGICAL_QUESTION_BANK"
WHERE "AREA_KEY" = 'personal-social'
  AND "LEVEL_CODE" = 'GENERAL'
  AND "QUESTION_KIND" = 'AREA';

INSERT INTO "PEDAGOGICAL_QUESTION_BANK" ("AREA_KEY", "LEVEL_CODE", "QUESTION_KIND", "QUESTION_TEXT", "SORT_ORDER")
VALUES
    ('personal-social', 'GENERAL', 'AREA', 'Establece vinculos positivos con sus pares y adultos.', 1),
    ('personal-social', 'GENERAL', 'AREA', 'Expresa sus emociones de manera adecuada.', 2),
    ('personal-social', 'GENERAL', 'AREA', 'Comparte materiales y participa en juegos grupales.', 3),
    ('personal-social', 'GENERAL', 'AREA', 'Respeta turnos y normas de convivencia.', 4),
    ('personal-social', 'GENERAL', 'AREA', 'Resuelve conflictos simples con apoyo o de forma verbal.', 5),
    ('personal-social', 'GENERAL', 'AREA', 'Demuestra autonomia en rutinas diarias.', 6),
    ('personal-social', 'GENERAL', 'AREA', 'Cuida sus pertenencias y materiales de trabajo.', 7),
    ('personal-social', 'GENERAL', 'AREA', 'Se integra de manera positiva a las actividades del grupo.', 8),
    ('personal-social', 'GENERAL', 'AREA', 'Demuestra empatia frente a las emociones de sus companeros.', 9),
    ('personal-social', 'GENERAL', 'AREA', 'Solicita ayuda cuando lo requiere.', 10);
