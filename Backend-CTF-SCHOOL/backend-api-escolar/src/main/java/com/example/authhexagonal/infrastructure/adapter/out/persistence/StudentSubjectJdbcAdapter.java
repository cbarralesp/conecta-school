package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.StudentPortalSubject;
import com.example.authhexagonal.domain.model.StudentSubjectDocumentRow;
import com.example.authhexagonal.domain.model.StudentSubjectHeader;
import com.example.authhexagonal.domain.port.out.StudentSubjectRepositoryPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
public class StudentSubjectJdbcAdapter implements StudentSubjectRepositoryPort {

    private final JdbcTemplate jdbcTemplate;

    public StudentSubjectJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<StudentPortalSubject> findSubjects(String username) {
        return jdbcTemplate.query("""
                WITH student_context AS (
                    SELECT
                        a."ID" AS student_id,
                        c."ID" AS course_id,
                        c."NOMBRE" AS course_name,
                        c."ANIO_ESCOLAR" AS school_year
                    FROM "USUARIOS" u
                    JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                    JOIN "ALUMNOS" a ON UPPER(a."RUN") = UPPER(p."RUN")
                    JOIN "MATRICULAS" m ON m."ALUMNO_ID" = a."ID" AND m."ACTIVA" = TRUE
                    JOIN "CURSOS" c ON c."ID" = m."CURSO_ID" AND c."ACTIVO" = TRUE
                    WHERE UPPER(u."USUARIO") = UPPER(?)
                       OR UPPER(COALESCE(p."CORREO_ELECTRONICO", '')) = UPPER(?)
                )
                SELECT
                    s."ID" AS subject_id,
                    s."NOMBRE" AS subject_name,
                    sc.course_name,
                    COALESCE(COUNT(DISTINCT hc."ID"), 0) AS weekly_blocks,
                    TRIM(COALESCE(tp."NOMBRES", '') || ' ' || COALESCE(tp."APELLIDOS", '')) AS teacher_name,
                    COUNT(DISTINCT docs.document_id) AS total_documents,
                    COUNT(DISTINCT CASE WHEN docs.reviewed = FALSE THEN docs.document_id END) AS new_documents
                FROM student_context sc
                JOIN "CARGAS_DOCENTES" cd
                  ON cd."CURSO_ID" = sc.course_id
                 AND cd."ACTIVA" = TRUE
                 %s
                JOIN "ASIGNATURAS" s ON s."ID" = cd."ASIGNATURA_ID" AND s."ACTIVA" = TRUE
                LEFT JOIN "HORARIOS_CARGAS" hc ON hc."CARGA_DOCENTE_ID" = cd."ID"
                LEFT JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                LEFT JOIN "PERSONAS" tp ON tp."ID" = pr."PERSONA_ID"
                LEFT JOIN LATERAL (
                    SELECT
                        pd."ID" AS document_id,
                        COALESCE(ade."REVISADO", FALSE) AS reviewed
                    FROM "UNIDADES_PLANIFICACION" up
                    JOIN "CLASES_PLANIFICACION_DOCUMENTOS" pd
                        ON COALESCE(pd."ELIMINADO", FALSE) = FALSE
                       AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
                       AND COALESCE(pd."VISIBLE_ALUMNOS", FALSE) = TRUE
                    LEFT JOIN "CLASES_PLANIFICACION" cp_doc ON cp_doc."ID" = pd."CLASE_ID"
                    LEFT JOIN "ALUMNO_DOCUMENTO_ESTADO" ade
                        ON ade."ALUMNO_ID" = sc.student_id
                       AND ade."DOCUMENTO_ID" = pd."ID"
                    WHERE up."CARGA_DOCENTE_ID" = cd."ID"
                      AND (
                          pd."UNIDAD_ID" = up."ID"
                          OR cp_doc."UNIDAD_ID" = up."ID"
                      )
                      AND (
                          pd."CLASE_ID" IS NULL
                          OR COALESCE(cp_doc."PUBLICADO_A_ALUMNOS", FALSE) = TRUE
                      )
                ) docs ON TRUE
                GROUP BY
                    s."ID",
                    s."NOMBRE",
                    sc.course_name,
                    tp."NOMBRES",
                    tp."APELLIDOS"
                ORDER BY s."NOMBRE"
                """.formatted(subjectScopeFilter("cd")), (rs, rowNum) -> new StudentPortalSubject(
                rs.getLong("subject_id"),
                rs.getString("subject_name"),
                rs.getString("course_name"),
                rs.getInt("weekly_blocks"),
                rs.getString("teacher_name"),
                rs.getInt("total_documents"),
                rs.getInt("new_documents")
        ), username, username);
    }

    @Override
    public Optional<StudentSubjectHeader> findSubjectHeader(String username, Long subjectId) {
        return jdbcTemplate.query("""
                WITH student_context AS (
                    SELECT
                        a."ID" AS student_id,
                        c."ID" AS course_id,
                        c."NOMBRE" AS course_name,
                        c."ANIO_ESCOLAR" AS school_year
                    FROM "USUARIOS" u
                    JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                    JOIN "ALUMNOS" a ON UPPER(a."RUN") = UPPER(p."RUN")
                    JOIN "MATRICULAS" m ON m."ALUMNO_ID" = a."ID" AND m."ACTIVA" = TRUE
                    JOIN "CURSOS" c ON c."ID" = m."CURSO_ID" AND c."ACTIVO" = TRUE
                    WHERE UPPER(u."USUARIO") = UPPER(?)
                       OR UPPER(COALESCE(p."CORREO_ELECTRONICO", '')) = UPPER(?)
                )
                SELECT
                    s."ID" AS subject_id,
                    s."NOMBRE" AS subject_name,
                    sc.course_name,
                    CASE
                        WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '1' || CHR(176) || ' Semestre ' || sc.school_year
                        ELSE '2' || CHR(176) || ' Semestre ' || sc.school_year
                    END AS semester_label,
                    TRIM(COALESCE(tp."NOMBRES", '') || ' ' || COALESCE(tp."APELLIDOS", '')) AS teacher_name,
                    COALESCE(COUNT(DISTINCT hc."ID"), 0) AS weekly_blocks
                FROM student_context sc
                JOIN "CARGAS_DOCENTES" cd
                  ON cd."CURSO_ID" = sc.course_id
                 AND cd."ACTIVA" = TRUE
                 %s
                JOIN "ASIGNATURAS" s ON s."ID" = cd."ASIGNATURA_ID" AND s."ACTIVA" = TRUE
                LEFT JOIN "HORARIOS_CARGAS" hc ON hc."CARGA_DOCENTE_ID" = cd."ID"
                LEFT JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                LEFT JOIN "PERSONAS" tp ON tp."ID" = pr."PERSONA_ID"
                WHERE s."ID" = ?
                GROUP BY
                    s."ID",
                    s."NOMBRE",
                    sc.course_name,
                    sc.school_year,
                    tp."NOMBRES",
                    tp."APELLIDOS"
                """.formatted(subjectScopeFilter("cd")), (rs, rowNum) -> new StudentSubjectHeader(
                rs.getLong("subject_id"),
                rs.getString("subject_name"),
                rs.getString("course_name"),
                rs.getString("semester_label"),
                rs.getString("teacher_name"),
                rs.getInt("weekly_blocks")
        ), username, username, subjectId).stream().findFirst();
    }

    @Override
    public List<StudentSubjectDocumentRow> findSubjectDocumentRows(String username, Long subjectId) {
        return jdbcTemplate.query("""
                WITH student_context AS (
                    SELECT
                        a."ID" AS student_id,
                        c."ID" AS course_id
                    FROM "USUARIOS" u
                    JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                    JOIN "ALUMNOS" a ON UPPER(a."RUN") = UPPER(p."RUN")
                    JOIN "MATRICULAS" m ON m."ALUMNO_ID" = a."ID" AND m."ACTIVA" = TRUE
                    JOIN "CURSOS" c ON c."ID" = m."CURSO_ID" AND c."ACTIVO" = TRUE
                    WHERE UPPER(u."USUARIO") = UPPER(?)
                       OR UPPER(COALESCE(p."CORREO_ELECTRONICO", '')) = UPPER(?)
                )
                SELECT
                    up."ID" AS unit_id,
                    CASE
                        WHEN up."NUMERO_UNIDAD" = 'UNIDAD_I' THEN '1'
                        WHEN up."NUMERO_UNIDAD" = 'UNIDAD_II' THEN '2'
                        WHEN up."NUMERO_UNIDAD" = 'UNIDAD_III' THEN '3'
                        WHEN up."NUMERO_UNIDAD" = 'UNIDAD_IV' THEN '4'
                        WHEN up."NUMERO_UNIDAD" = 'UNIDAD_V' THEN '5'
                        WHEN up."NUMERO_UNIDAD" = 'UNIDAD_VI' THEN '6'
                        WHEN up."NUMERO_UNIDAD" = 'UNIDAD_VII' THEN '7'
                        WHEN up."NUMERO_UNIDAD" = 'UNIDAD_VIII' THEN '8'
                        ELSE COALESCE(up."NUMERO_UNIDAD", '')
                    END AS unit_number,
                    up."NOMBRE" AS unit_name,
                    COALESCE(up."SEMANAS_ESTIMADAS", 0) AS duration_weeks,
                    cp."ID" AS class_id,
                    COALESCE(cp."TITULO", 'Material general de la unidad') AS class_title,
                    cp."FECHA_PLANIFICADA" AS class_date,
                    pd."ID" AS document_id,
                    pd."NOMBRE_ORIGINAL" AS file_name,
                    CASE
                        WHEN LOWER(COALESCE(pd."EXTENSION", '')) IN ('png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp') THEN 'IMAGEN'
                        WHEN LOWER(COALESCE(pd."EXTENSION", '')) = 'pdf' THEN 'PDF'
                        WHEN LOWER(COALESCE(pd."EXTENSION", '')) IN ('doc', 'docx') THEN 'WORD'
                        WHEN LOWER(COALESCE(pd."EXTENSION", '')) IN ('ppt', 'pptx') THEN 'PPT'
                        ELSE 'OTRO'
                    END AS file_type,
                    COALESCE(pd."MIME_TYPE", 'application/octet-stream') AS mime_type,
                    COALESCE(pd."EXTENSION", '') AS extension,
                    COALESCE(pd."PESO_BYTES", 0) AS file_size_bytes,
                    pd."FECHA_CARGA" AS published_at,
                    COALESCE(ade."REVISADO", FALSE) AS reviewed
                FROM student_context sc
                JOIN "CARGAS_DOCENTES" cd
                  ON cd."CURSO_ID" = sc.course_id
                 AND cd."ACTIVA" = TRUE
                 %s
                JOIN "ASIGNATURAS" s ON s."ID" = cd."ASIGNATURA_ID" AND s."ACTIVA" = TRUE AND s."ID" = ?
                JOIN "UNIDADES_PLANIFICACION" up ON up."CARGA_DOCENTE_ID" = cd."ID"
                JOIN "CLASES_PLANIFICACION_DOCUMENTOS" pd
                    ON COALESCE(pd."ELIMINADO", FALSE) = FALSE
                   AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
                   AND COALESCE(pd."VISIBLE_ALUMNOS", FALSE) = TRUE
                LEFT JOIN "CLASES_PLANIFICACION" cp ON cp."ID" = pd."CLASE_ID"
                LEFT JOIN "ALUMNO_DOCUMENTO_ESTADO" ade
                    ON ade."ALUMNO_ID" = sc.student_id
                   AND ade."DOCUMENTO_ID" = pd."ID"
                WHERE (
                    pd."UNIDAD_ID" = up."ID"
                    OR cp."UNIDAD_ID" = up."ID"
                )
                  AND (
                    pd."CLASE_ID" IS NULL
                    OR COALESCE(cp."PUBLICADO_A_ALUMNOS", FALSE) = TRUE
                  )
                ORDER BY
                    COALESCE(up."FECHA_INICIO", up."FECHA_CREACION") DESC NULLS LAST,
                    up."ID" DESC,
                    cp."FECHA_PLANIFICADA" ASC NULLS LAST,
                    cp."ID" ASC NULLS LAST,
                    COALESCE(ade."REVISADO", FALSE) ASC,
                    pd."FECHA_CARGA" DESC,
                    pd."ID" DESC
                """.formatted(subjectScopeFilter("cd")), (rs, rowNum) -> mapDocumentRow(rs), username, username, subjectId);
    }

    private String subjectScopeFilter(String alias) {
        if (tableExists("ASIGNATURA_CURSOS")) {
            return """
                 AND (
                    NOT EXISTS (
                        SELECT 1
                        FROM "ASIGNATURA_CURSOS" ac_any
                        WHERE ac_any."ASIGNATURA_ID" = %1$s."ASIGNATURA_ID"
                          AND ac_any."ACTIVA" = TRUE
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM "ASIGNATURA_CURSOS" ac_match
                        WHERE ac_match."ASIGNATURA_ID" = %1$s."ASIGNATURA_ID"
                          AND ac_match."CURSO_ID" = %1$s."CURSO_ID"
                          AND ac_match."ACTIVA" = TRUE
                    )
                 )
                """.formatted(alias);
        }

        return "";
    }

    private boolean tableExists(String tableName) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND UPPER(table_name) = UPPER(?)
                )
                """, Boolean.class, tableName);
        return Boolean.TRUE.equals(exists);
    }

    private StudentSubjectDocumentRow mapDocumentRow(ResultSet rs) throws SQLException {
        return new StudentSubjectDocumentRow(
                rs.getLong("unit_id"),
                rs.getString("unit_number"),
                rs.getString("unit_name"),
                rs.getInt("duration_weeks"),
                readNullableLong(rs, "class_id"),
                rs.getString("class_title"),
                readNullableDate(rs, "class_date"),
                rs.getLong("document_id"),
                rs.getString("file_name"),
                rs.getString("file_type"),
                rs.getString("mime_type"),
                rs.getString("extension"),
                rs.getLong("file_size_bytes"),
                rs.getTimestamp("published_at").toLocalDateTime(),
                rs.getBoolean("reviewed")
        );
    }

    private Long readNullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private LocalDate readNullableDate(ResultSet rs, String column) throws SQLException {
        var date = rs.getDate(column);
        return date == null ? null : date.toLocalDate();
    }
}
