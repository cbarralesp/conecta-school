SELECT setval(
    'public."ASISTENCIA_REGISTROS_ID_seq"',
    COALESCE((SELECT MAX("ID") FROM public."ASISTENCIA_REGISTROS"), 0),
    true
);

SELECT setval(
    'public."ASISTENCIA_DETALLES_ID_seq"',
    COALESCE((SELECT MAX("ID") FROM public."ASISTENCIA_DETALLES"), 0),
    true
);
