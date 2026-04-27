package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.StudentDocumentDownload;
import com.example.authhexagonal.domain.port.out.FileStoragePort;
import com.example.authhexagonal.domain.port.out.StudentDocumentRepositoryPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class StudentDocumentJdbcAdapter implements StudentDocumentRepositoryPort {

    private final JdbcTemplate jdbcTemplate;
    private final FileStoragePort fileStoragePort;

    public StudentDocumentJdbcAdapter(JdbcTemplate jdbcTemplate, FileStoragePort fileStoragePort) {
        this.jdbcTemplate = jdbcTemplate;
        this.fileStoragePort = fileStoragePort;
    }

    @Override
    public void markReviewed(String username, Long documentId) {
        jdbcTemplate.update("""
                WITH student_context AS (
                    SELECT a."ID" AS student_id
                    FROM "USUARIOS" u
                    JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                    JOIN "ALUMNOS" a ON UPPER(a."RUN") = UPPER(p."RUN")
                    WHERE UPPER(u."USUARIO") = UPPER(?)
                       OR UPPER(COALESCE(p."CORREO_ELECTRONICO", '')) = UPPER(?)
                ),
                accessible_document AS (
                    SELECT DISTINCT pd."ID"
                    FROM student_context sc
                    JOIN "MATRICULAS" m ON m."ALUMNO_ID" = sc.student_id AND m."ACTIVA" = TRUE
                    JOIN "CURSOS" c ON c."ID" = m."CURSO_ID" AND c."ACTIVO" = TRUE
                    JOIN "CLASES_PLANIFICACION_DOCUMENTOS" pd
                        ON pd."ID" = ?
                       AND COALESCE(pd."ELIMINADO", FALSE) = FALSE
                       AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
                       AND COALESCE(pd."VISIBLE_ALUMNOS", FALSE) = TRUE
                    LEFT JOIN "CLASES_PLANIFICACION" cp_doc ON cp_doc."ID" = pd."CLASE_ID"
                    JOIN "UNIDADES_PLANIFICACION" up
                        ON up."ID" = COALESCE(pd."UNIDAD_ID", cp_doc."UNIDAD_ID")
                    JOIN "CARGAS_DOCENTES" cd
                        ON cd."ID" = up."CARGA_DOCENTE_ID"
                       AND cd."CURSO_ID" = c."ID"
                       AND cd."ACTIVA" = TRUE
                    WHERE (
                        pd."CLASE_ID" IS NULL
                        OR COALESCE(cp_doc."PUBLICADO_A_ALUMNOS", FALSE) = TRUE
                    )
                )
                INSERT INTO "ALUMNO_DOCUMENTO_ESTADO" (
                    "ALUMNO_ID",
                    "DOCUMENTO_ID",
                    "REVISADO",
                    "FECHA_REVISION",
                    "DESCARGADO",
                    "FECHA_DESCARGA"
                )
                SELECT
                    sc.student_id,
                    ad."ID",
                    TRUE,
                    CURRENT_TIMESTAMP,
                    FALSE,
                    NULL
                FROM student_context sc
                JOIN accessible_document ad ON 1 = 1
                ON CONFLICT ("ALUMNO_ID", "DOCUMENTO_ID")
                DO UPDATE SET
                    "REVISADO" = TRUE,
                    "FECHA_REVISION" = CURRENT_TIMESTAMP
                """, username, username, documentId);
    }

    @Override
    public Optional<StudentDocumentDownload> downloadDocument(String username, Long documentId) {
        return jdbcTemplate.query("""
                WITH student_context AS (
                    SELECT a."ID" AS student_id
                    FROM "USUARIOS" u
                    JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                    JOIN "ALUMNOS" a ON UPPER(a."RUN") = UPPER(p."RUN")
                    WHERE UPPER(u."USUARIO") = UPPER(?)
                       OR UPPER(COALESCE(p."CORREO_ELECTRONICO", '')) = UPPER(?)
                )
                SELECT DISTINCT
                    pd."NOMBRE_ORIGINAL",
                    COALESCE(pd."MIME_TYPE", 'application/octet-stream') AS mime_type,
                    pd."RUTA_ARCHIVO"
                FROM student_context sc
                JOIN "MATRICULAS" m ON m."ALUMNO_ID" = sc.student_id AND m."ACTIVA" = TRUE
                JOIN "CURSOS" c ON c."ID" = m."CURSO_ID" AND c."ACTIVO" = TRUE
                JOIN "CLASES_PLANIFICACION_DOCUMENTOS" pd
                    ON pd."ID" = ?
                   AND COALESCE(pd."ELIMINADO", FALSE) = FALSE
                   AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
                   AND COALESCE(pd."VISIBLE_ALUMNOS", FALSE) = TRUE
                LEFT JOIN "CLASES_PLANIFICACION" cp_doc ON cp_doc."ID" = pd."CLASE_ID"
                JOIN "UNIDADES_PLANIFICACION" up
                    ON up."ID" = COALESCE(pd."UNIDAD_ID", cp_doc."UNIDAD_ID")
                JOIN "CARGAS_DOCENTES" cd
                    ON cd."ID" = up."CARGA_DOCENTE_ID"
                   AND cd."CURSO_ID" = c."ID"
                   AND cd."ACTIVA" = TRUE
                WHERE (
                    pd."CLASE_ID" IS NULL
                    OR COALESCE(cp_doc."PUBLICADO_A_ALUMNOS", FALSE) = TRUE
                )
                """, (rs, rowNum) -> new StudentDocumentDownload(
                rs.getString("NOMBRE_ORIGINAL"),
                rs.getString("mime_type"),
                fileStoragePort.read(rs.getString("RUTA_ARCHIVO"))
        ), username, username, documentId).stream().findFirst();
    }
}
