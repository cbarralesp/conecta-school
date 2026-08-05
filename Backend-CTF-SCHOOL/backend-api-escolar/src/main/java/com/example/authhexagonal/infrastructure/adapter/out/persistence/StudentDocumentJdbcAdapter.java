package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.StudentDocumentDownload;
import com.example.authhexagonal.domain.port.out.FileStoragePort;
import com.example.authhexagonal.domain.port.out.StudentDocumentRepositoryPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Optional;
import java.util.regex.Pattern;

@Component
public class StudentDocumentJdbcAdapter implements StudentDocumentRepositoryPort {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^A-Za-z0-9]+");

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
                    COALESCE(pd."EXTENSION", '') AS extension,
                    COALESCE(pd."MIME_TYPE", 'application/octet-stream') AS mime_type,
                    pd."RUTA_ARCHIVO",
                    COALESCE(cd."ANIO_ESCOLAR", EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER) AS school_year,
                    CASE
                        WHEN EXTRACT(MONTH FROM COALESCE(up."FECHA_INICIO", up."FECHA_TERMINO", cp_doc."FECHA_PLANIFICADA", CURRENT_DATE)) BETWEEN 1 AND 6 THEN 1
                        ELSE 2
                    END AS semester,
                    a."NOMBRE" AS subject_name,
                    c."NOMBRE" AS course_name,
                    CASE
                        WHEN cp_doc."ID" IS NULL THEN NULL
                        ELSE (
                            SELECT COUNT(*)
                            FROM "CLASES_PLANIFICACION" cp_seq
                            JOIN "UNIDADES_PLANIFICACION" up_seq ON up_seq."ID" = cp_seq."UNIDAD_ID"
                            WHERE up_seq."CARGA_DOCENTE_ID" = up."CARGA_DOCENTE_ID"
                              AND (
                                  COALESCE(cp_seq."FECHA_PLANIFICADA", DATE '9999-12-31') < COALESCE(cp_doc."FECHA_PLANIFICADA", DATE '9999-12-31')
                                  OR (
                                      COALESCE(cp_seq."FECHA_PLANIFICADA", DATE '9999-12-31') = COALESCE(cp_doc."FECHA_PLANIFICADA", DATE '9999-12-31')
                                      AND cp_seq."ID" <= cp_doc."ID"
                                  )
                              )
                        )
                    END AS class_number
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
                JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                WHERE (
                    pd."CLASE_ID" IS NULL
                    OR COALESCE(cp_doc."PUBLICADO_A_ALUMNOS", FALSE) = TRUE
                )
                """, (rs, rowNum) -> new StudentDocumentDownload(
                rs.getString("NOMBRE_ORIGINAL"),
                buildDownloadFileName(
                        rs.getInt("school_year"),
                        rs.getInt("semester"),
                        rs.getString("subject_name"),
                        rs.getString("course_name"),
                        readNullableInteger(rs.getObject("class_number")),
                        rs.getString("NOMBRE_ORIGINAL"),
                        rs.getString("extension")
                ),
                rs.getString("mime_type"),
                fileStoragePort.read(rs.getString("RUTA_ARCHIVO"))
        ), username, username, documentId).stream().findFirst();
    }

    private Integer readNullableInteger(Object value) {
        return value instanceof Number number ? number.intValue() : null;
    }

    private String buildDownloadFileName(
            int schoolYear,
            int semester,
            String subjectName,
            String courseName,
            Integer classNumber,
            String originalName,
            String extension
    ) {
        String sequence = classNumber == null
                ? "Material01"
                : "Clase%02d".formatted(Math.max(classNumber, 1));
        String normalizedExtension = normalizeExtension(extension, originalName);

        return "%d_%dS_%s_%s_%s_TFS%s".formatted(
                schoolYear,
                semester,
                compactToken(subjectName, "Asignatura"),
                compactToken(courseName, "Curso"),
                sequence,
                normalizedExtension
        );
    }

    private String compactToken(String value, String fallback) {
        String source = value == null || value.isBlank() ? fallback : value;
        String withoutAccents = DIACRITICS.matcher(Normalizer.normalize(source, Normalizer.Form.NFD)).replaceAll("");
        String[] parts = NON_ALPHANUMERIC.split(withoutAccents.trim());
        StringBuilder token = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            token.append(part.substring(0, 1).toUpperCase());
            if (part.length() > 1) {
                token.append(part.substring(1).toLowerCase());
            }
        }
        return token.isEmpty() ? fallback : token.toString();
    }

    private String normalizeExtension(String extension, String originalName) {
        String resolvedExtension = extension;
        if ((resolvedExtension == null || resolvedExtension.isBlank()) && originalName != null) {
            int dotIndex = originalName.lastIndexOf('.');
            if (dotIndex >= 0 && dotIndex < originalName.length() - 1) {
                resolvedExtension = originalName.substring(dotIndex + 1);
            }
        }
        if (resolvedExtension == null || resolvedExtension.isBlank()) {
            return "";
        }
        String cleanExtension = NON_ALPHANUMERIC.matcher(resolvedExtension.trim()).replaceAll("");
        return cleanExtension.isBlank() ? "" : "." + cleanExtension.toLowerCase();
    }
}
