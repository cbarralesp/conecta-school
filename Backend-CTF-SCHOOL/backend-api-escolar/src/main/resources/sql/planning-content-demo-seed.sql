-- Seed manual de respaldo para el modulo Contenido.
-- Inserta data demo solo si no existe y reutiliza la primera carga docente activa disponible.

DO $$
DECLARE
    v_load_id BIGINT;
    v_user_id BIGINT;
    v_unit_1 BIGINT;
    v_unit_2 BIGINT;
    v_class_1 BIGINT;
    v_class_2 BIGINT;
    v_class_3 BIGINT;
    v_class_4 BIGINT;
    v_class_5 BIGINT;
BEGIN
    SELECT cd."ID", u."ID"
    INTO v_load_id, v_user_id
    FROM "CARGAS_DOCENTES" cd
    JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID" AND c."ACTIVO" = TRUE
    JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID" AND a."ACTIVA" = TRUE
    JOIN "PROFESORES" p ON p."ID" = cd."PROFESOR_ID"
    JOIN "USUARIOS" u ON u."PERSONA_ID" = p."PERSONA_ID"
    WHERE cd."ACTIVA" = TRUE
    ORDER BY cd."ANIO_ESCOLAR" DESC, cd."ID"
    LIMIT 1;

    IF v_load_id IS NULL OR v_user_id IS NULL THEN
        RAISE NOTICE 'No se encontro una carga docente activa para el seed de Contenido';
        RETURN;
    END IF;

    INSERT INTO "UNIDADES_PLANIFICACION" (
        "CARGA_DOCENTE_ID", "NUMERO_UNIDAD", "NOMBRE", "SEMANA_INICIO", "FECHA_INICIO", "FECHA_TERMINO",
        "SEMANAS_ESTIMADAS", "CLASES_PLANIFICADAS", "DESCRIPCION_GENERAL", "OBJETIVOS_APRENDIZAJE",
        "INDICADORES_LOGRO", "ESTADO", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_load_id, 'UNIDAD_I', 'El sistema solar y los movimientos de la Tierra', NULL, DATE '2026-03-10', DATE '2026-03-24',
           2, 3, 'Unidad demo para vista precargada de contenido',
           'Comprender los elementos principales del sistema solar y los movimientos de la Tierra',
           'Explica movimientos, estaciones y ubicacion de los planetas', 'ACTIVA', v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "UNIDADES_PLANIFICACION"
        WHERE "CARGA_DOCENTE_ID" = v_load_id
          AND UPPER("NOMBRE") = UPPER('El sistema solar y los movimientos de la Tierra')
    );

    INSERT INTO "UNIDADES_PLANIFICACION" (
        "CARGA_DOCENTE_ID", "NUMERO_UNIDAD", "NOMBRE", "SEMANA_INICIO", "FECHA_INICIO", "FECHA_TERMINO",
        "SEMANAS_ESTIMADAS", "CLASES_PLANIFICADAS", "DESCRIPCION_GENERAL", "OBJETIVOS_APRENDIZAJE",
        "INDICADORES_LOGRO", "ESTADO", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_load_id, 'UNIDAD_II', 'Tecnicas de dibujo y pintura', NULL, DATE '2026-03-25', DATE '2026-04-14',
           3, 2, 'Unidad demo con tecnicas visuales y materiales de arte',
           'Reconocer materiales y aplicar tecnicas basicas de dibujo y pintura',
           'Usa materiales y tecnicas en ejercicios guiados', 'ACTIVA', v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "UNIDADES_PLANIFICACION"
        WHERE "CARGA_DOCENTE_ID" = v_load_id
          AND UPPER("NOMBRE") = UPPER('Tecnicas de dibujo y pintura')
    );

    SELECT "ID" INTO v_unit_1
    FROM "UNIDADES_PLANIFICACION"
    WHERE "CARGA_DOCENTE_ID" = v_load_id
      AND UPPER("NOMBRE") = UPPER('El sistema solar y los movimientos de la Tierra')
    LIMIT 1;

    SELECT "ID" INTO v_unit_2
    FROM "UNIDADES_PLANIFICACION"
    WHERE "CARGA_DOCENTE_ID" = v_load_id
      AND UPPER("NOMBRE") = UPPER('Tecnicas de dibujo y pintura')
    LIMIT 1;

    INSERT INTO "CLASES_PLANIFICACION" (
        "UNIDAD_ID", "TITULO", "FECHA_PLANIFICADA", "DURACION_CODIGO", "DURACION_LABEL",
        "OA_CODIGO", "OA_TITULO", "OA_DESCRIPCION", "TIPO_EVALUACION", "INICIO_ACTIVIDAD",
        "DESARROLLO_ACTIVIDAD", "CIERRE_ACTIVIDAD", "ESTADO", "PUBLICADO_A_ALUMNOS", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_unit_1, 'Clase 1: Introduccion al sistema solar', DATE '2026-03-10', '90_MIN', '90 minutos',
           'OA-SS-01', 'Identificar planetas y componentes del sistema solar',
           'Observacion guiada y analisis de planetas interiores y exteriores', 'FORMATIVA',
           'Pregunta de activacion sobre el universo', 'Presentacion del sistema solar y trabajo con guia',
           'Sintesis colectiva de aprendizajes', 'PUBLICADA', TRUE, v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "CLASES_PLANIFICACION"
        WHERE "UNIDAD_ID" = v_unit_1
          AND UPPER("TITULO") = UPPER('Clase 1: Introduccion al sistema solar')
    );

    INSERT INTO "CLASES_PLANIFICACION" (
        "UNIDAD_ID", "TITULO", "FECHA_PLANIFICADA", "DURACION_CODIGO", "DURACION_LABEL",
        "OA_CODIGO", "OA_TITULO", "OA_DESCRIPCION", "TIPO_EVALUACION", "INICIO_ACTIVIDAD",
        "DESARROLLO_ACTIVIDAD", "CIERRE_ACTIVIDAD", "ESTADO", "PUBLICADO_A_ALUMNOS", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_unit_1, 'Clase 2: Movimientos de la Tierra', DATE '2026-03-14', '90_MIN', '90 minutos',
           'OA-SS-02', 'Relacionar rotacion y traslacion con fenomenos cotidianos',
           'Explicacion de rotacion, traslacion y estaciones', 'FORMATIVA',
           'Recuperacion de conocimientos previos', 'Modelado con esquemas y preguntas guiadas',
           'Conclusiones sobre estaciones del ano', 'BORRADOR', FALSE, v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "CLASES_PLANIFICACION"
        WHERE "UNIDAD_ID" = v_unit_1
          AND UPPER("TITULO") = UPPER('Clase 2: Movimientos de la Tierra')
    );

    INSERT INTO "CLASES_PLANIFICACION" (
        "UNIDAD_ID", "TITULO", "FECHA_PLANIFICADA", "DURACION_CODIGO", "DURACION_LABEL",
        "OA_CODIGO", "OA_TITULO", "OA_DESCRIPCION", "TIPO_EVALUACION", "INICIO_ACTIVIDAD",
        "DESARROLLO_ACTIVIDAD", "CIERRE_ACTIVIDAD", "ESTADO", "PUBLICADO_A_ALUMNOS", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_unit_1, 'Clase 3: Las estaciones y sus efectos', DATE '2026-03-18', '90_MIN', '90 minutos',
           'OA-SS-03', 'Describir como cambian las estaciones',
           'Analisis de clima y luz solar durante el ano', 'SUMATIVA',
           'Observacion de imagenes del clima', 'Trabajo en parejas con esquema de estaciones',
           'Puesta en comun y ticket de salida', 'PUBLICADA', TRUE, v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "CLASES_PLANIFICACION"
        WHERE "UNIDAD_ID" = v_unit_1
          AND UPPER("TITULO") = UPPER('Clase 3: Las estaciones y sus efectos')
    );

    INSERT INTO "CLASES_PLANIFICACION" (
        "UNIDAD_ID", "TITULO", "FECHA_PLANIFICADA", "DURACION_CODIGO", "DURACION_LABEL",
        "OA_CODIGO", "OA_TITULO", "OA_DESCRIPCION", "TIPO_EVALUACION", "INICIO_ACTIVIDAD",
        "DESARROLLO_ACTIVIDAD", "CIERRE_ACTIVIDAD", "ESTADO", "PUBLICADO_A_ALUMNOS", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_unit_2, 'Clase 1: Materiales y herramientas basicas', DATE '2026-03-26', '90_MIN', '90 minutos',
           'OA-AR-01', 'Reconocer materiales de dibujo y pintura',
           'Exploracion de materiales artisticos y usos principales', 'FORMATIVA',
           'Conversacion inicial sobre materiales conocidos', 'Exploracion de herramientas y registro visual',
           'Cierre con comparacion de materiales', 'PUBLICADA', TRUE, v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "CLASES_PLANIFICACION"
        WHERE "UNIDAD_ID" = v_unit_2
          AND UPPER("TITULO") = UPPER('Clase 1: Materiales y herramientas basicas')
    );

    INSERT INTO "CLASES_PLANIFICACION" (
        "UNIDAD_ID", "TITULO", "FECHA_PLANIFICADA", "DURACION_CODIGO", "DURACION_LABEL",
        "OA_CODIGO", "OA_TITULO", "OA_DESCRIPCION", "TIPO_EVALUACION", "INICIO_ACTIVIDAD",
        "DESARROLLO_ACTIVIDAD", "CIERRE_ACTIVIDAD", "ESTADO", "PUBLICADO_A_ALUMNOS", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_unit_2, 'Clase 2: Tecnicas mixtas y composicion', DATE '2026-04-02', '90_MIN', '90 minutos',
           'OA-AR-02', 'Aplicar tecnicas mixtas en una composicion simple',
           'Planificacion y ejecucion de una composicion guiada', 'FORMATIVA',
           'Revision de referentes visuales', 'Trabajo practico con tecnica mixta',
           'Autoevaluacion breve del proceso', 'BORRADOR', FALSE, v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "CLASES_PLANIFICACION"
        WHERE "UNIDAD_ID" = v_unit_2
          AND UPPER("TITULO") = UPPER('Clase 2: Tecnicas mixtas y composicion')
    );

    SELECT "ID" INTO v_class_1 FROM "CLASES_PLANIFICACION" WHERE "UNIDAD_ID" = v_unit_1 AND UPPER("TITULO") = UPPER('Clase 1: Introduccion al sistema solar') LIMIT 1;
    SELECT "ID" INTO v_class_2 FROM "CLASES_PLANIFICACION" WHERE "UNIDAD_ID" = v_unit_1 AND UPPER("TITULO") = UPPER('Clase 2: Movimientos de la Tierra') LIMIT 1;
    SELECT "ID" INTO v_class_3 FROM "CLASES_PLANIFICACION" WHERE "UNIDAD_ID" = v_unit_1 AND UPPER("TITULO") = UPPER('Clase 3: Las estaciones y sus efectos') LIMIT 1;
    SELECT "ID" INTO v_class_4 FROM "CLASES_PLANIFICACION" WHERE "UNIDAD_ID" = v_unit_2 AND UPPER("TITULO") = UPPER('Clase 1: Materiales y herramientas basicas') LIMIT 1;
    SELECT "ID" INTO v_class_5 FROM "CLASES_PLANIFICACION" WHERE "UNIDAD_ID" = v_unit_2 AND UPPER("TITULO") = UPPER('Clase 2: Tecnicas mixtas y composicion') LIMIT 1;

    INSERT INTO "CLASES_PLANIFICACION_DOCUMENTOS" (
        "CLASE_ID", "UNIDAD_ID", "NOMBRE_ORIGINAL", "NOMBRE_ARCHIVO", "EXTENSION", "MIME_TYPE",
        "PESO_BYTES", "RUTA_ARCHIVO", "TIPO_ARCHIVO", "VISIBLE_ALUMNOS", "ESTADO", "ELIMINADO", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_class_1, v_unit_1, 'Guia del sistema solar - Introduccion.pdf', 'guia-sistema-solar-introduccion-demo.pdf',
           'pdf', 'application/pdf', 120, 'uploads/planning-classes/guia-sistema-solar-introduccion-demo.pdf',
           'PDF', TRUE, 'ACTIVO', FALSE, v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "CLASES_PLANIFICACION_DOCUMENTOS"
        WHERE "CLASE_ID" = v_class_1
          AND UPPER("NOMBRE_ORIGINAL") = UPPER('Guia del sistema solar - Introduccion.pdf')
          AND COALESCE("ELIMINADO", FALSE) = FALSE
    );

    INSERT INTO "CLASES_PLANIFICACION_DOCUMENTOS" (
        "CLASE_ID", "UNIDAD_ID", "NOMBRE_ORIGINAL", "NOMBRE_ARCHIVO", "EXTENSION", "MIME_TYPE",
        "PESO_BYTES", "RUTA_ARCHIVO", "TIPO_ARCHIVO", "VISIBLE_ALUMNOS", "ESTADO", "ELIMINADO", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_class_1, v_unit_1, 'Presentacion - Planetas del sistema solar.pptx', 'presentacion-planetas-sistema-solar-demo.pptx',
           'pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 120,
           'uploads/planning-classes/presentacion-planetas-sistema-solar-demo.pptx',
           'PPT', TRUE, 'ACTIVO', FALSE, v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "CLASES_PLANIFICACION_DOCUMENTOS"
        WHERE "CLASE_ID" = v_class_1
          AND UPPER("NOMBRE_ORIGINAL") = UPPER('Presentacion - Planetas del sistema solar.pptx')
          AND COALESCE("ELIMINADO", FALSE) = FALSE
    );

    INSERT INTO "CLASES_PLANIFICACION_DOCUMENTOS" (
        "CLASE_ID", "UNIDAD_ID", "NOMBRE_ORIGINAL", "NOMBRE_ARCHIVO", "EXTENSION", "MIME_TYPE",
        "PESO_BYTES", "RUTA_ARCHIVO", "TIPO_ARCHIVO", "VISIBLE_ALUMNOS", "ESTADO", "ELIMINADO", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_class_2, v_unit_1, 'Actividad - Rotacion y traslacion.docx', 'actividad-rotacion-traslacion-demo.docx',
           'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 120,
           'uploads/planning-classes/actividad-rotacion-traslacion-demo.docx',
           'WORD', FALSE, 'ACTIVO', FALSE, v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "CLASES_PLANIFICACION_DOCUMENTOS"
        WHERE "CLASE_ID" = v_class_2
          AND UPPER("NOMBRE_ORIGINAL") = UPPER('Actividad - Rotacion y traslacion.docx')
          AND COALESCE("ELIMINADO", FALSE) = FALSE
    );

    INSERT INTO "CLASES_PLANIFICACION_DOCUMENTOS" (
        "CLASE_ID", "UNIDAD_ID", "NOMBRE_ORIGINAL", "NOMBRE_ARCHIVO", "EXTENSION", "MIME_TYPE",
        "PESO_BYTES", "RUTA_ARCHIVO", "TIPO_ARCHIVO", "VISIBLE_ALUMNOS", "ESTADO", "ELIMINADO", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_class_3, v_unit_1, 'Infografia - Estaciones del ano.pdf', 'infografia-estaciones-ano-demo.pdf',
           'pdf', 'application/pdf', 120, 'uploads/planning-classes/infografia-estaciones-ano-demo.pdf',
           'PDF', TRUE, 'ACTIVO', FALSE, v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "CLASES_PLANIFICACION_DOCUMENTOS"
        WHERE "CLASE_ID" = v_class_3
          AND UPPER("NOMBRE_ORIGINAL") = UPPER('Infografia - Estaciones del ano.pdf')
          AND COALESCE("ELIMINADO", FALSE) = FALSE
    );

    INSERT INTO "CLASES_PLANIFICACION_DOCUMENTOS" (
        "CLASE_ID", "UNIDAD_ID", "NOMBRE_ORIGINAL", "NOMBRE_ARCHIVO", "EXTENSION", "MIME_TYPE",
        "PESO_BYTES", "RUTA_ARCHIVO", "TIPO_ARCHIVO", "VISIBLE_ALUMNOS", "ESTADO", "ELIMINADO", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_class_4, v_unit_2, 'Catalogo de materiales artisticos.pdf', 'catalogo-materiales-artisticos-demo.pdf',
           'pdf', 'application/pdf', 120, 'uploads/planning-classes/catalogo-materiales-artisticos-demo.pdf',
           'PDF', TRUE, 'ACTIVO', FALSE, v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "CLASES_PLANIFICACION_DOCUMENTOS"
        WHERE "CLASE_ID" = v_class_4
          AND UPPER("NOMBRE_ORIGINAL") = UPPER('Catalogo de materiales artisticos.pdf')
          AND COALESCE("ELIMINADO", FALSE) = FALSE
    );

    INSERT INTO "CLASES_PLANIFICACION_DOCUMENTOS" (
        "CLASE_ID", "UNIDAD_ID", "NOMBRE_ORIGINAL", "NOMBRE_ARCHIVO", "EXTENSION", "MIME_TYPE",
        "PESO_BYTES", "RUTA_ARCHIVO", "TIPO_ARCHIVO", "VISIBLE_ALUMNOS", "ESTADO", "ELIMINADO", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_class_4, v_unit_2, 'Ejemplos de tecnicas mixtas.jpg', 'ejemplos-tecnicas-mixtas-demo.jpg',
           'jpg', 'image/jpeg', 120, 'uploads/planning-classes/ejemplos-tecnicas-mixtas-demo.jpg',
           'OTRO', FALSE, 'ACTIVO', FALSE, v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "CLASES_PLANIFICACION_DOCUMENTOS"
        WHERE "CLASE_ID" = v_class_4
          AND UPPER("NOMBRE_ORIGINAL") = UPPER('Ejemplos de tecnicas mixtas.jpg')
          AND COALESCE("ELIMINADO", FALSE) = FALSE
    );

    INSERT INTO "CLASES_PLANIFICACION_DOCUMENTOS" (
        "CLASE_ID", "UNIDAD_ID", "NOMBRE_ORIGINAL", "NOMBRE_ARCHIVO", "EXTENSION", "MIME_TYPE",
        "PESO_BYTES", "RUTA_ARCHIVO", "TIPO_ARCHIVO", "VISIBLE_ALUMNOS", "ESTADO", "ELIMINADO", "CREADO_POR_USUARIO_ID"
    )
    SELECT v_class_5, v_unit_2, 'Guia de composicion creativa.docx', 'guia-composicion-creativa-demo.docx',
           'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 120,
           'uploads/planning-classes/guia-composicion-creativa-demo.docx',
           'WORD', FALSE, 'ACTIVO', FALSE, v_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM "CLASES_PLANIFICACION_DOCUMENTOS"
        WHERE "CLASE_ID" = v_class_5
          AND UPPER("NOMBRE_ORIGINAL") = UPPER('Guia de composicion creativa.docx')
          AND COALESCE("ELIMINADO", FALSE) = FALSE
    );
END $$;
