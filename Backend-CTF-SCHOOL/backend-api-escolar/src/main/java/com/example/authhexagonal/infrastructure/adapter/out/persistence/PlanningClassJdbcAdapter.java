package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.CurriculumObjective;
import com.example.authhexagonal.domain.model.PlanningClass;
import com.example.authhexagonal.domain.model.PlanningClassCatalogUnit;
import com.example.authhexagonal.domain.model.PlanningClassDocument;
import com.example.authhexagonal.domain.model.PlanningClassObjectiveSelection;
import com.example.authhexagonal.domain.model.PlanningClassStatus;
import com.example.authhexagonal.domain.model.PlanningDocumentFileType;
import com.example.authhexagonal.domain.model.PlanningEvaluationType;
import com.example.authhexagonal.domain.model.PlanningObjectiveOption;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.authhexagonal.domain.port.out.PlanningClassCatalogRepositoryPort;
import com.example.authhexagonal.domain.port.out.PlanningClassDocumentRepositoryPort;
import com.example.authhexagonal.domain.port.out.PlanningClassRepositoryPort;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class PlanningClassJdbcAdapter implements
        PlanningClassRepositoryPort,
        PlanningClassCatalogRepositoryPort,
        PlanningClassDocumentRepositoryPort {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private volatile Boolean objectiveSelectionsColumnAvailable;

    public PlanningClassJdbcAdapter(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<PlanningClassCatalogUnit> findUnits(String username) {
        return jdbcTemplate.query("""
                WITH app_user AS (
                    SELECT
                        u."PERSONA_ID" AS persona_id,
                        COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
                    FROM "USUARIOS" u
                    LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                    LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
                    WHERE u."USUARIO" = ?
                )
                SELECT
                    up."ID" AS unit_id,
                    up."NUMERO_UNIDAD",
                    up."NOMBRE" AS unit_name,
                    COALESCE(up."OBJETIVOS_APRENDIZAJE", '') AS learning_objectives,
                    a."ID" AS subject_id,
                    a."NOMBRE" AS subject_name,
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    up."ESTADO"
                FROM app_user cu
                JOIN "UNIDADES_PLANIFICACION" up ON 1 = 1
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                WHERE (
                    cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')
                    OR pr."PERSONA_ID" = cu.persona_id
                )
                ORDER BY up."FECHA_CREACION" DESC, up."ID" DESC
                """, (rs, rowNum) -> mapCatalogUnit(rs), username);
    }

    @Override
    public Optional<PlanningClassCatalogUnit> findAccessibleUnitById(String username, Long unitId) {
        return findUnits(username).stream()
                .filter(unit -> unit.unitId().equals(unitId))
                .findFirst();
    }

    @Override
    public List<PlanningObjectiveOption> findObjectives(String username) {
        return jdbcTemplate.query("""
                WITH app_user AS (
                    SELECT
                        u."PERSONA_ID" AS persona_id,
                        COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
                    FROM "USUARIOS" u
                    LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                    LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
                    WHERE u."USUARIO" = ?
                ),
                accessible_units AS (
                    SELECT
                        up."ID" AS unit_id,
                        up."NUMERO_UNIDAD",
                        a."ID" AS subject_id,
                        c."ID" AS course_id
                    FROM app_user cu
                    JOIN "UNIDADES_PLANIFICACION" up ON 1 = 1
                    JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                    JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                    JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                    JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                    WHERE (
                        cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')
                        OR pr."PERSONA_ID" = cu.persona_id
                    )
                )
                SELECT
                    au.unit_id,
                    co."ID" AS objective_id,
                    co."CODIGO",
                    co."TITULO",
                    co."DESCRIPCION",
                    COALESCE(co."EJE", '') AS axis,
                    COALESCE(STRING_AGG(DISTINCT coh."NOMBRE", '||') FILTER (WHERE coh."NOMBRE" IS NOT NULL), '') AS skills,
                    COALESCE(STRING_AGG(DISTINCT coa."DESCRIPCION", '||') FILTER (WHERE coa."DESCRIPCION" IS NOT NULL), '') AS attitudes
                FROM accessible_units au
                JOIN "CURRICULUM_OBJETIVOS" co
                  ON co."ASIGNATURA_ID" = au.subject_id
                 AND co."CURSO_ID" = au.course_id
                 AND co."ACTIVO" = TRUE
                 AND (co."UNIDAD_NUMERO" = 'GENERAL' OR co."UNIDAD_NUMERO" = au."NUMERO_UNIDAD")
                LEFT JOIN "CURRICULUM_OBJETIVO_HABILIDADES" coh ON coh."OBJETIVO_ID" = co."ID"
                LEFT JOIN "CURRICULUM_OBJETIVO_ACTITUDES" coa ON coa."OBJETIVO_ID" = co."ID"
                GROUP BY au.unit_id, co."ID", co."CODIGO", co."TITULO", co."DESCRIPCION", co."EJE"
                ORDER BY au.unit_id, co."CODIGO"
                """, (rs, rowNum) -> new PlanningObjectiveOption(
                rs.getString("objective_id"),
                rs.getString("CODIGO"),
                rs.getString("TITULO"),
                rs.getString("DESCRIPCION"),
                rs.getLong("unit_id"),
                rs.getString("axis"),
                splitList(rs.getString("skills")),
                splitList(rs.getString("attitudes"))
        ), username);
    }

    @Override
    public PlanningClass createClass(
            Long unitId,
            String title,
            LocalDate plannedDate,
            String durationCode,
            String durationLabel,
            String objectiveCode,
            String objectiveTitle,
            String objectiveDescription,
            String evaluationType,
            String startActivity,
            String developmentActivity,
            String closingActivity,
            PlanningClassStatus status,
            boolean publishedToStudents,
            Long createdByUserId
    ) {
        Long classId = jdbcTemplate.queryForObject("""
                INSERT INTO "CLASES_PLANIFICACION" (
                    "UNIDAD_ID",
                    "TITULO",
                    "FECHA_PLANIFICADA",
                    "DURACION_CODIGO",
                    "DURACION_LABEL",
                    "OA_CODIGO",
                    "OA_TITULO",
                    "OA_DESCRIPCION",
                    "TIPO_EVALUACION",
                    "INICIO_ACTIVIDAD",
                    "DESARROLLO_ACTIVIDAD",
                    "CIERRE_ACTIVIDAD",
                    "ESTADO",
                    "PUBLICADO_A_ALUMNOS",
                    "CREADO_POR_USUARIO_ID"
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING "ID"
                """, Long.class,
                unitId,
                title,
                plannedDate,
                durationCode,
                durationLabel,
                objectiveCode,
                objectiveTitle,
                objectiveDescription,
                evaluationType,
                startActivity,
                developmentActivity,
                closingActivity,
                status.name(),
                publishedToStudents,
                createdByUserId
        );

        return findById(classId).orElseThrow();
    }

    @Override
    public PlanningClass updateTitle(Long classId, String title) {
        jdbcTemplate.update("""
                UPDATE "CLASES_PLANIFICACION"
                SET "TITULO" = ?,
                    "FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP
                WHERE "ID" = ?
                """, title, classId);

        return findById(classId).orElseThrow();
    }

    @Override
    public PlanningClass updateClass(
            Long classId,
            Long unitId,
            String title,
            LocalDate plannedDate,
            String durationCode,
            String durationLabel,
            String objectiveCode,
            String objectiveTitle,
            String objectiveDescription,
            String evaluationType,
            String startActivity,
            String developmentActivity,
            String closingActivity,
            PlanningClassStatus status,
            boolean publishedToStudents
    ) {
        jdbcTemplate.update("""
                UPDATE "CLASES_PLANIFICACION"
                SET "UNIDAD_ID" = ?,
                    "TITULO" = ?,
                    "FECHA_PLANIFICADA" = ?,
                    "DURACION_CODIGO" = ?,
                    "DURACION_LABEL" = ?,
                    "OA_CODIGO" = ?,
                    "OA_TITULO" = ?,
                    "OA_DESCRIPCION" = ?,
                    "TIPO_EVALUACION" = ?,
                    "INICIO_ACTIVIDAD" = ?,
                    "DESARROLLO_ACTIVIDAD" = ?,
                    "CIERRE_ACTIVIDAD" = ?,
                    "ESTADO" = ?,
                    "PUBLICADO_A_ALUMNOS" = ?,
                    "FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP
                WHERE "ID" = ?
                """,
                unitId,
                title,
                plannedDate,
                durationCode,
                durationLabel,
                objectiveCode,
                objectiveTitle,
                objectiveDescription,
                evaluationType,
                startActivity,
                developmentActivity,
                closingActivity,
                status.name(),
                publishedToStudents,
                classId
        );

        return findById(classId).orElseThrow();
    }

    @Override
    public void deleteClass(Long classId) {
        deleteCurriculumObjectiveLinks(classId);

        jdbcTemplate.update("""
                DELETE FROM "CLASES_PLANIFICACION_DOCUMENTOS"
                WHERE "CLASE_ID" = ?
                """, classId);

        jdbcTemplate.update("""
                DELETE FROM "CLASES_PLANIFICACION"
                WHERE "ID" = ?
                """, classId);
    }

    @Override
    public void syncCurriculumObjectives(Long classId, List<UUID> objectiveIds) {
        try {
            jdbcTemplate.update("""
                    DELETE FROM planning_class_curriculum_objectives
                    WHERE planning_class_id = ?
                    """, classId);

            if (objectiveIds == null || objectiveIds.isEmpty()) {
                return;
            }

            jdbcTemplate.batchUpdate("""
                    INSERT INTO planning_class_curriculum_objectives (planning_class_id, objective_id)
                    VALUES (?, ?)
                    ON CONFLICT DO NOTHING
                    """, objectiveIds, objectiveIds.size(), (ps, objectiveId) -> {
                ps.setLong(1, classId);
                ps.setObject(2, objectiveId);
            });
        } catch (BadSqlGrammarException ignored) {
            // Keep existing planning flows alive while the curriculum schema is applied.
        }
    }

    @Override
    public void saveObjectiveSelections(Long classId, List<PlanningClassObjectiveSelection> objectiveSelections) {
        if (!hasObjectiveSelectionsColumn()) {
            return;
        }
        try {
            jdbcTemplate.update("""
                    UPDATE "CLASES_PLANIFICACION"
                    SET "OA_INDICADORES_JSON" = CAST(? AS jsonb),
                        "FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP
                    WHERE "ID" = ?
                    """, writeObjectiveSelections(objectiveSelections), classId);
        } catch (BadSqlGrammarException ignored) {
            // Keep existing planning flows alive while the migration is not available yet.
        }
    }

    @Override
    public List<UUID> findCurriculumObjectiveIdsByClassId(Long classId) {
        try {
            return jdbcTemplate.query("""
                    SELECT objective_id
                    FROM planning_class_curriculum_objectives
                    WHERE planning_class_id = ?
                    ORDER BY objective_id
                    """, (rs, rowNum) -> rs.getObject("objective_id", UUID.class), classId);
        } catch (BadSqlGrammarException ignored) {
            return List.of();
        }
    }

    @Override
    public List<CurriculumObjective> findCurriculumObjectivesByClassId(Long classId) {
        try {
            return jdbcTemplate.query("""
                    SELECT
                        o.id,
                        o.grade_id,
                        o.codigo,
                        o.tipo,
                        COALESCE(o.eje, '') AS eje,
                        o.descripcion
                    FROM planning_class_curriculum_objectives pcco
                    JOIN curriculum_objectives o ON o.id = pcco.objective_id
                    JOIN curriculum_grades g ON g.id = o.grade_id
                    JOIN curriculum_subjects s ON s.id = g.subject_id
                    WHERE pcco.planning_class_id = ?
                    ORDER BY
                        s.nombre,
                        CAST(g.grado AS INTEGER),
                        CASE o.tipo
                            WHEN 'conocimiento' THEN 1
                            WHEN 'habilidad' THEN 2
                            ELSE 3
                        END,
                        o.codigo
                    """, (rs, rowNum) -> new CurriculumObjective(
                    rs.getObject("id", UUID.class),
                    rs.getObject("grade_id", UUID.class),
                    rs.getString("codigo"),
                    rs.getString("tipo"),
                    rs.getString("eje"),
                    rs.getString("descripcion"),
                    List.of()
            ), classId).stream().map(this::withCurriculumSubItems).toList();
        } catch (BadSqlGrammarException ignored) {
            return List.of();
        }
    }

    @Override
    public Optional<PlanningClass> findAccessibleById(String username, Long classId) {
        return jdbcTemplate.query("""
                WITH app_user AS (
                    SELECT
                        u."PERSONA_ID" AS persona_id,
                        COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
                    FROM "USUARIOS" u
                    LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                    LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
                    WHERE u."USUARIO" = ?
                )
                SELECT
                    cp."ID",
                    cp."UNIDAD_ID",
                    a."ID" AS subject_id,
                    a."NOMBRE" AS subject_name,
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    up."NUMERO_UNIDAD",
                    up."NOMBRE" AS unit_name,
                    cp."TITULO",
                    cp."FECHA_PLANIFICADA",
                    cp."DURACION_CODIGO",
                    cp."DURACION_LABEL",
                    cp."OA_CODIGO",
                    cp."OA_TITULO",
                    COALESCE(cp."OA_DESCRIPCION", '') AS objective_description,
                    cp."TIPO_EVALUACION",
                    COALESCE(cp."INICIO_ACTIVIDAD", '') AS start_activity,
                    COALESCE(cp."DESARROLLO_ACTIVIDAD", '') AS development_activity,
                    COALESCE(cp."CIERRE_ACTIVIDAD", '') AS closing_activity,
                    %s AS objective_selections_json,
                    cp."ESTADO",
                    cp."PUBLICADO_A_ALUMNOS",
                    u."USUARIO" AS created_by,
                    cp."FECHA_CREACION",
                    cp."FECHA_ACTUALIZACION"
                FROM app_user cu
                JOIN "CLASES_PLANIFICACION" cp ON cp."ID" = ?
                JOIN "UNIDADES_PLANIFICACION" up ON up."ID" = cp."UNIDAD_ID"
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                JOIN "USUARIOS" u ON u."ID" = cp."CREADO_POR_USUARIO_ID"
                WHERE (
                    cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')
                    OR pr."PERSONA_ID" = cu.persona_id
                )
                """.formatted(objectiveSelectionsSelectSql()), (rs, rowNum) -> mapPlanningClass(rs), username, classId).stream().findFirst()
                .map(this::withDocuments);
    }

    @Override
    public List<PlanningClass> findClasses(
            String username,
            Long courseId,
            Long subjectId,
            Integer semester,
            Integer month,
            PlanningClassStatus status,
            PlanningDocumentFileType documentType,
            String search
    ) {
        StringBuilder sql = new StringBuilder("""
                WITH app_user AS (
                    SELECT
                        u."PERSONA_ID" AS persona_id,
                        COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
                    FROM "USUARIOS" u
                    LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                    LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
                    WHERE u."USUARIO" = ?
                )
                SELECT
                    cp."ID",
                    cp."UNIDAD_ID",
                    a."ID" AS subject_id,
                    a."NOMBRE" AS subject_name,
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    up."NUMERO_UNIDAD",
                    up."NOMBRE" AS unit_name,
                    cp."TITULO",
                    cp."FECHA_PLANIFICADA",
                    cp."DURACION_CODIGO",
                    cp."DURACION_LABEL",
                    cp."OA_CODIGO",
                    cp."OA_TITULO",
                    COALESCE(cp."OA_DESCRIPCION", '') AS objective_description,
                    cp."TIPO_EVALUACION",
                    COALESCE(cp."INICIO_ACTIVIDAD", '') AS start_activity,
                    COALESCE(cp."DESARROLLO_ACTIVIDAD", '') AS development_activity,
                    COALESCE(cp."CIERRE_ACTIVIDAD", '') AS closing_activity,
                    %s AS objective_selections_json,
                    cp."ESTADO",
                    cp."PUBLICADO_A_ALUMNOS",
                    creator."USUARIO" AS created_by,
                    cp."FECHA_CREACION",
                    cp."FECHA_ACTUALIZACION"
                FROM app_user cu
                JOIN "CLASES_PLANIFICACION" cp ON 1 = 1
                JOIN "UNIDADES_PLANIFICACION" up ON up."ID" = cp."UNIDAD_ID"
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "USUARIOS" creator ON creator."ID" = cp."CREADO_POR_USUARIO_ID"
                WHERE (
                    cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')
                    OR pr."PERSONA_ID" = cu.persona_id
                )
                """.formatted(objectiveSelectionsSelectSql()));

        java.util.List<Object> args = new java.util.ArrayList<>();
        args.add(username);

        if (courseId != null) {
            sql.append(" AND c.\"ID\" = ?");
            args.add(courseId);
        }

        if (subjectId != null) {
            sql.append(" AND a.\"ID\" = ?");
            args.add(subjectId);
        }

        if (search != null && !search.isBlank()) {
            sql.append("""
                     AND UPPER(
                        cp."TITULO" || ' ' || up."NOMBRE" || ' ' || a."NOMBRE" || ' ' || c."NOMBRE" || ' ' || COALESCE(cp."OA_CODIGO", '')
                    ) LIKE '%' || UPPER(?) || '%'
                    """);
            args.add(search.trim());
        }

        if (semester != null) {
            if (semester == 1) {
                sql.append(" AND EXTRACT(MONTH FROM cp.\"FECHA_PLANIFICADA\") BETWEEN 1 AND 6");
            } else if (semester == 2) {
                sql.append(" AND EXTRACT(MONTH FROM cp.\"FECHA_PLANIFICADA\") BETWEEN 7 AND 12");
            }
        }

        if (month != null) {
            sql.append(" AND EXTRACT(MONTH FROM cp.\"FECHA_PLANIFICADA\") = ?");
            args.add(month);
        }

        if (status != null) {
            sql.append(" AND cp.\"ESTADO\" = ?");
            args.add(status.name());
        }

        if (documentType != null) {
            sql.append("""
                     AND EXISTS (
                        SELECT 1
                        FROM "CLASES_PLANIFICACION_DOCUMENTOS" pd
                        WHERE pd."CLASE_ID" = cp."ID"
                          AND COALESCE(pd."ELIMINADO", FALSE) = FALSE
                          AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
                          AND COALESCE(pd."TIPO_ARCHIVO", CASE
                                WHEN LOWER(pd."EXTENSION") IN ('doc', 'docx') THEN 'WORD'
                                WHEN LOWER(pd."EXTENSION") = 'pdf' THEN 'PDF'
                                WHEN LOWER(pd."EXTENSION") IN ('ppt', 'pptx') THEN 'PPT'
                                ELSE 'OTRO'
                              END) = ?
                    )
                    """);
            args.add(documentType.name());
        }

        sql.append(" ORDER BY cp.\"FECHA_PLANIFICADA\" DESC, cp.\"ID\" DESC");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapPlanningClass(rs), args.toArray()).stream()
                .map(planningClass -> withDocuments(planningClass, documentType))
                .toList();
    }

    @Override
    public PlanningClassDocument createDocument(
            Long classId,
            String originalName,
            String storedName,
            String extension,
            String mimeType,
            long sizeBytes,
            String filePath,
            boolean visibleToStudents
    ) {
        Long documentId = jdbcTemplate.queryForObject("""
                INSERT INTO "CLASES_PLANIFICACION_DOCUMENTOS" (
                    "CLASE_ID",
                    "UNIDAD_ID",
                    "NOMBRE_ORIGINAL",
                    "NOMBRE_ARCHIVO",
                    "EXTENSION",
                    "MIME_TYPE",
                    "PESO_BYTES",
                    "RUTA_ARCHIVO",
                    "TIPO_ARCHIVO",
                    "VISIBLE_ALUMNOS",
                    "ESTADO",
                    "ELIMINADO",
                    "CREADO_POR_USUARIO_ID"
                )
                VALUES (
                    ?,
                    (SELECT "UNIDAD_ID" FROM "CLASES_PLANIFICACION" WHERE "ID" = ?),
                    ?, ?, ?, ?, ?, ?,
                    CASE
                        WHEN LOWER(?) IN ('doc', 'docx') THEN 'WORD'
                        WHEN LOWER(?) = 'pdf' THEN 'PDF'
                        WHEN LOWER(?) IN ('ppt', 'pptx') THEN 'PPT'
                        ELSE 'OTRO'
                    END,
                    ?,
                    'ACTIVO',
                    FALSE,
                    (SELECT "CREADO_POR_USUARIO_ID" FROM "CLASES_PLANIFICACION" WHERE "ID" = ?)
                )
                RETURNING "ID"
                """, Long.class,
                classId,
                classId,
                originalName,
                storedName,
                extension,
                mimeType,
                sizeBytes,
                filePath,
                extension,
                extension,
                extension,
                visibleToStudents,
                classId
        );

        return findByIdAndClassId(documentId, classId).orElseThrow();
    }

    @Override
    public List<PlanningClassDocument> findByClassId(Long classId) {
        return findByClassId(classId, null);
    }

    private List<PlanningClassDocument> findByClassId(Long classId, PlanningDocumentFileType documentType) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    "ID",
                    "CLASE_ID",
                    "NOMBRE_ORIGINAL",
                    "NOMBRE_ARCHIVO",
                    "EXTENSION",
                    "MIME_TYPE",
                    "PESO_BYTES",
                    "RUTA_ARCHIVO",
                    COALESCE("TIPO_ARCHIVO", CASE
                        WHEN LOWER("EXTENSION") IN ('doc', 'docx') THEN 'WORD'
                        WHEN LOWER("EXTENSION") = 'pdf' THEN 'PDF'
                        WHEN LOWER("EXTENSION") IN ('ppt', 'pptx') THEN 'PPT'
                        ELSE 'OTRO'
                    END) AS "TIPO_ARCHIVO",
                    "VISIBLE_ALUMNOS",
                    "FECHA_CARGA"
                FROM "CLASES_PLANIFICACION_DOCUMENTOS"
                WHERE "CLASE_ID" = ?
                  AND COALESCE("ELIMINADO", FALSE) = FALSE
                  AND COALESCE("ESTADO", 'ACTIVO') = 'ACTIVO'
                """);

        java.util.List<Object> args = new java.util.ArrayList<>();
        args.add(classId);
        if (documentType != null) {
            sql.append(" AND COALESCE(\"TIPO_ARCHIVO\", CASE WHEN LOWER(\"EXTENSION\") IN ('doc', 'docx') THEN 'WORD' WHEN LOWER(\"EXTENSION\") = 'pdf' THEN 'PDF' WHEN LOWER(\"EXTENSION\") IN ('ppt', 'pptx') THEN 'PPT' ELSE 'OTRO' END) = ?");
            args.add(documentType.name());
        }

        sql.append(" ORDER BY \"FECHA_CARGA\" DESC, \"ID\" DESC");
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapDocument(rs), args.toArray());
    }

    @Override
    public Optional<PlanningClassDocument> findByIdAndClassId(Long documentId, Long classId) {
        return jdbcTemplate.query("""
                SELECT
                    "ID",
                    "CLASE_ID",
                    "NOMBRE_ORIGINAL",
                    "NOMBRE_ARCHIVO",
                    "EXTENSION",
                    "MIME_TYPE",
                    "PESO_BYTES",
                    "RUTA_ARCHIVO",
                    COALESCE("TIPO_ARCHIVO", CASE
                        WHEN LOWER("EXTENSION") IN ('doc', 'docx') THEN 'WORD'
                        WHEN LOWER("EXTENSION") = 'pdf' THEN 'PDF'
                        WHEN LOWER("EXTENSION") IN ('ppt', 'pptx') THEN 'PPT'
                        ELSE 'OTRO'
                    END) AS "TIPO_ARCHIVO",
                    "VISIBLE_ALUMNOS",
                    "FECHA_CARGA"
                FROM "CLASES_PLANIFICACION_DOCUMENTOS"
                WHERE "ID" = ?
                  AND "CLASE_ID" = ?
                  AND COALESCE("ELIMINADO", FALSE) = FALSE
                  AND COALESCE("ESTADO", 'ACTIVO') = 'ACTIVO'
                """, (rs, rowNum) -> mapDocument(rs), documentId, classId).stream().findFirst();
    }

    @Override
    public void deleteDocument(Long documentId) {
        jdbcTemplate.update("""
                UPDATE "CLASES_PLANIFICACION_DOCUMENTOS"
                SET "ESTADO" = 'ELIMINADO',
                    "ELIMINADO" = TRUE
                WHERE "ID" = ?
                """, documentId);
    }

    private Optional<PlanningClass> findById(Long classId) {
        return jdbcTemplate.query("""
                SELECT
                    cp."ID",
                    cp."UNIDAD_ID",
                    a."ID" AS subject_id,
                    a."NOMBRE" AS subject_name,
                    c."ID" AS course_id,
                    c."NOMBRE" AS course_name,
                    up."NUMERO_UNIDAD",
                    up."NOMBRE" AS unit_name,
                    cp."TITULO",
                    cp."FECHA_PLANIFICADA",
                    cp."DURACION_CODIGO",
                    cp."DURACION_LABEL",
                    cp."OA_CODIGO",
                    cp."OA_TITULO",
                    COALESCE(cp."OA_DESCRIPCION", '') AS objective_description,
                    cp."TIPO_EVALUACION",
                    COALESCE(cp."INICIO_ACTIVIDAD", '') AS start_activity,
                    COALESCE(cp."DESARROLLO_ACTIVIDAD", '') AS development_activity,
                    COALESCE(cp."CIERRE_ACTIVIDAD", '') AS closing_activity,
                    %s AS objective_selections_json,
                    cp."ESTADO",
                    cp."PUBLICADO_A_ALUMNOS",
                    u."USUARIO" AS created_by,
                    cp."FECHA_CREACION",
                    cp."FECHA_ACTUALIZACION"
                FROM "CLASES_PLANIFICACION" cp
                JOIN "UNIDADES_PLANIFICACION" up ON up."ID" = cp."UNIDAD_ID"
                JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                JOIN "USUARIOS" u ON u."ID" = cp."CREADO_POR_USUARIO_ID"
                WHERE cp."ID" = ?
                """.formatted(objectiveSelectionsSelectSql()), (rs, rowNum) -> mapPlanningClass(rs), classId).stream().findFirst()
                .map(this::withDocuments);
    }

    private PlanningClassCatalogUnit mapCatalogUnit(ResultSet rs) throws SQLException {
        return new PlanningClassCatalogUnit(
                rs.getLong("unit_id"),
                resolveUnitNumberLabel(rs.getString("NUMERO_UNIDAD")),
                rs.getString("unit_name"),
                rs.getString("learning_objectives"),
                rs.getLong("subject_id"),
                rs.getString("subject_name"),
                rs.getLong("course_id"),
                rs.getString("course_name"),
                rs.getString("ESTADO")
        );
    }

    private PlanningClass mapPlanningClass(ResultSet rs) throws SQLException {
        return new PlanningClass(
                rs.getLong("ID"),
                rs.getLong("UNIDAD_ID"),
                rs.getLong("subject_id"),
                rs.getString("subject_name"),
                rs.getLong("course_id"),
                rs.getString("course_name"),
                resolveUnitNumberLabel(rs.getString("NUMERO_UNIDAD")),
                rs.getString("unit_name"),
                rs.getString("TITULO"),
                rs.getDate("FECHA_PLANIFICADA").toLocalDate(),
                rs.getString("DURACION_CODIGO"),
                rs.getString("DURACION_LABEL"),
                rs.getString("OA_CODIGO"),
                rs.getString("OA_TITULO"),
                rs.getString("objective_description"),
                PlanningEvaluationType.valueOf(rs.getString("TIPO_EVALUACION")),
                rs.getString("start_activity"),
                rs.getString("development_activity"),
                rs.getString("closing_activity"),
                PlanningClassStatus.valueOf(rs.getString("ESTADO")),
                rs.getBoolean("PUBLICADO_A_ALUMNOS"),
                rs.getString("created_by"),
                rs.getTimestamp("FECHA_CREACION").toLocalDateTime(),
                rs.getTimestamp("FECHA_ACTUALIZACION").toLocalDateTime(),
                List.of(),
                List.of(),
                List.of(),
                parseObjectiveSelections(rs.getString("objective_selections_json"))
        );
    }

    private PlanningClassDocument mapDocument(ResultSet rs) throws SQLException {
        return new PlanningClassDocument(
                rs.getLong("ID"),
                rs.getLong("CLASE_ID"),
                rs.getString("NOMBRE_ORIGINAL"),
                rs.getString("NOMBRE_ARCHIVO"),
                rs.getString("EXTENSION"),
                rs.getString("MIME_TYPE"),
                rs.getLong("PESO_BYTES"),
                rs.getString("RUTA_ARCHIVO"),
                PlanningDocumentFileType.valueOf(rs.getString("TIPO_ARCHIVO")),
                rs.getBoolean("VISIBLE_ALUMNOS"),
                rs.getTimestamp("FECHA_CARGA").toLocalDateTime()
        );
    }

    private PlanningClass withDocuments(PlanningClass planningClass) {
        return withDocuments(planningClass, null);
    }

    private PlanningClass withDocuments(PlanningClass planningClass, PlanningDocumentFileType documentType) {
        return new PlanningClass(
                planningClass.id(),
                planningClass.unitId(),
                planningClass.subjectId(),
                planningClass.subjectName(),
                planningClass.courseId(),
                planningClass.courseName(),
                planningClass.unitNumberLabel(),
                planningClass.unitName(),
                planningClass.title(),
                planningClass.plannedDate(),
                planningClass.durationCode(),
                planningClass.durationLabel(),
                planningClass.objectiveCode(),
                planningClass.objectiveTitle(),
                planningClass.objectiveDescription(),
                planningClass.evaluationType(),
                planningClass.startActivity(),
                planningClass.developmentActivity(),
                planningClass.closingActivity(),
                planningClass.status(),
                planningClass.publishedToStudents(),
                planningClass.createdBy(),
                planningClass.createdAt(),
                planningClass.updatedAt(),
                findByClassId(planningClass.id(), documentType),
                findCurriculumObjectiveIdsByClassId(planningClass.id()),
                findCurriculumObjectivesByClassId(planningClass.id()),
                planningClass.objectiveSelections()
        );
    }

    private String resolveUnitNumberLabel(String unitNumber) {
        return switch (unitNumber) {
            case "UNIDAD_I" -> "Unidad I";
            case "UNIDAD_II" -> "Unidad II";
            case "UNIDAD_III" -> "Unidad III";
            case "UNIDAD_IV" -> "Unidad IV";
            case "UNIDAD_V" -> "Unidad V";
            case "UNIDAD_VI" -> "Unidad VI";
            case "UNIDAD_VII" -> "Unidad VII";
            case "UNIDAD_VIII" -> "Unidad VIII";
            default -> unitNumber;
        };
    }

    private CurriculumObjective withCurriculumSubItems(CurriculumObjective objective) {
        List<String> subItems;
        try {
            subItems = jdbcTemplate.query("""
                    SELECT descripcion
                    FROM curriculum_objective_items
                    WHERE objective_id = ?
                    ORDER BY orden
                    """, (rs, rowNum) -> rs.getString("descripcion"), objective.id());
        } catch (BadSqlGrammarException ignored) {
            subItems = List.of();
        }

        return new CurriculumObjective(
                objective.id(),
                objective.gradeId(),
                objective.codigo(),
                objective.tipo(),
                objective.eje(),
                objective.descripcion(),
                subItems
        );
    }

    private List<String> splitList(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }

        return java.util.Arrays.stream(value.split("\\|\\|"))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }

    private String writeObjectiveSelections(List<PlanningClassObjectiveSelection> objectiveSelections) {
        try {
            return objectMapper.writeValueAsString(objectiveSelections == null ? List.of() : objectiveSelections);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("No fue posible serializar los indicadores de OA de la clase", exception);
        }
    }

    private List<PlanningClassObjectiveSelection> parseObjectiveSelections(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }

        try {
            return objectMapper.readValue(rawJson, new TypeReference<List<PlanningClassObjectiveSelection>>() {});
        } catch (Exception exception) {
            return List.of();
        }
    }

    private void deleteCurriculumObjectiveLinks(Long classId) {
        try {
            jdbcTemplate.update("""
                    DELETE FROM planning_class_curriculum_objectives
                    WHERE planning_class_id = ?
                    """, classId);
        } catch (BadSqlGrammarException ignored) {
            // Ignore while the curriculum schema is not available yet.
        }
    }

    private String objectiveSelectionsSelectSql() {
        return hasObjectiveSelectionsColumn()
                ? "COALESCE(cp.\"OA_INDICADORES_JSON\"::text, '[]')"
                : "'[]'";
    }

    private boolean hasObjectiveSelectionsColumn() {
        Boolean cached = objectiveSelectionsColumnAvailable;
        if (cached != null) {
            return cached;
        }

        synchronized (this) {
            if (objectiveSelectionsColumnAvailable != null) {
                return objectiveSelectionsColumnAvailable;
            }

            Boolean exists = jdbcTemplate.query("""
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = 'CLASES_PLANIFICACION'
                          AND column_name = 'OA_INDICADORES_JSON'
                    )
                    """, rs -> rs.next() && rs.getBoolean(1));

            objectiveSelectionsColumnAvailable = Boolean.TRUE.equals(exists);
            return objectiveSelectionsColumnAvailable;
        }
    }
}
