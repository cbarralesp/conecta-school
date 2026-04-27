package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.PlanningDocument;
import com.example.authhexagonal.domain.model.PlanningDocumentFileType;
import com.example.authhexagonal.domain.model.PlanningDocumentFilter;
import com.example.authhexagonal.domain.model.PlanningDocumentOrigin;
import com.example.authhexagonal.domain.model.PlanningDocumentStatus;
import com.example.authhexagonal.domain.port.out.PlanningDocumentRepositoryPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Adapter JDBC para el banco centralizado de documentos de planificacion.
 */
@Component
public class PlanningDocumentsJdbcAdapter implements PlanningDocumentRepositoryPort {

    private static final Logger LOGGER = LoggerFactory.getLogger(PlanningDocumentsJdbcAdapter.class);

    private final JdbcTemplate jdbcTemplate;

    public PlanningDocumentsJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<PlanningDocument> findDocuments(String username, PlanningDocumentFilter filter) {
        StringBuilder sql = new StringBuilder();
        sql.append("WITH app_user AS (");
        sql.append(" SELECT u.\"PERSONA_ID\" AS persona_id, COALESCE(ar.\"CODIGO\", 'PROFESOR') AS role_code");
        sql.append(" FROM \"USUARIOS\" u");
        sql.append(" LEFT JOIN \"ADMIN_USER_SETTINGS\" aus ON aus.\"USUARIO_ID\" = u.\"ID\"");
        sql.append(" LEFT JOIN \"ADMIN_ROLES\" ar ON ar.\"ID\" = aus.\"ROL_ID\"");
        sql.append(" WHERE u.\"USUARIO\" = ?");
        sql.append(") ");
        sql.append("SELECT ");
        sql.append(" pd.\"ID\",");
        sql.append(" pd.\"UNIDAD_ID\",");
        sql.append(" pd.\"CLASE_ID\",");
        sql.append(" pd.\"NOMBRE_ORIGINAL\",");
        sql.append(" pd.\"NOMBRE_ARCHIVO\",");
        sql.append(" pd.\"EXTENSION\",");
        sql.append(" pd.\"MIME_TYPE\",");
        sql.append(" pd.\"PESO_BYTES\",");
        sql.append(" pd.\"RUTA_ARCHIVO\",");
        sql.append(" COALESCE(pd.\"TIPO_ARCHIVO\", CASE");
        sql.append("   WHEN LOWER(pd.\"EXTENSION\") IN ('doc', 'docx') THEN 'WORD'");
        sql.append("   WHEN LOWER(pd.\"EXTENSION\") = 'pdf' THEN 'PDF'");
        sql.append("   WHEN LOWER(pd.\"EXTENSION\") IN ('ppt', 'pptx') THEN 'PPT'");
        sql.append("   ELSE 'OTRO'");
        sql.append(" END) AS file_type,");
        sql.append(" CASE WHEN pd.\"CLASE_ID\" IS NOT NULL THEN 'CLASE' ELSE 'UNIDAD' END AS origin_type,");
        sql.append(" COALESCE(pd.\"ESTADO\", 'ACTIVO') AS status_code,");
        sql.append(" pd.\"VISIBLE_ALUMNOS\",");
        sql.append(" pd.\"FECHA_CARGA\",");
        sql.append(" a.\"ID\" AS subject_id,");
        sql.append(" a.\"NOMBRE\" AS subject_name,");
        sql.append(" c.\"NOMBRE\" AS course_name,");
        sql.append(" up.\"NUMERO_UNIDAD\",");
        sql.append(" up.\"NOMBRE\" AS unit_name,");
        sql.append(" COALESCE(cp.\"TITULO\", '') AS class_title,");
        sql.append(" COALESCE(creator.\"USUARIO\", '') AS created_by");
        sql.append(" FROM app_user cu");
        sql.append(" JOIN \"CLASES_PLANIFICACION_DOCUMENTOS\" pd ON 1 = 1");
        sql.append(" LEFT JOIN \"CLASES_PLANIFICACION\" cp ON cp.\"ID\" = pd.\"CLASE_ID\"");
        sql.append(" LEFT JOIN \"UNIDADES_PLANIFICACION\" up ON up.\"ID\" = COALESCE(pd.\"UNIDAD_ID\", cp.\"UNIDAD_ID\")");
        sql.append(" LEFT JOIN \"CARGAS_DOCENTES\" cd ON cd.\"ID\" = up.\"CARGA_DOCENTE_ID\"");
        sql.append(" LEFT JOIN \"PROFESORES\" pr ON pr.\"ID\" = cd.\"PROFESOR_ID\"");
        sql.append(" LEFT JOIN \"ASIGNATURAS\" a ON a.\"ID\" = cd.\"ASIGNATURA_ID\"");
        sql.append(" LEFT JOIN \"CURSOS\" c ON c.\"ID\" = cd.\"CURSO_ID\"");
        sql.append(" LEFT JOIN \"USUARIOS\" creator ON creator.\"ID\" = pd.\"CREADO_POR_USUARIO_ID\"");
        sql.append(" WHERE COALESCE(pd.\"ELIMINADO\", FALSE) = FALSE");
        sql.append(" AND COALESCE(pd.\"ESTADO\", 'ACTIVO') = 'ACTIVO'");
        sql.append(" AND (");
        sql.append("   cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')");
        sql.append("   OR pr.\"PERSONA_ID\" = cu.persona_id");
        sql.append(" )");

        List<Object> args = new ArrayList<>();
        args.add(username);

        if (filter.fileType() != null) {
            sql.append(" AND COALESCE(pd.\"TIPO_ARCHIVO\", CASE");
            sql.append("   WHEN LOWER(pd.\"EXTENSION\") IN ('doc', 'docx') THEN 'WORD'");
            sql.append("   WHEN LOWER(pd.\"EXTENSION\") = 'pdf' THEN 'PDF'");
            sql.append("   WHEN LOWER(pd.\"EXTENSION\") IN ('ppt', 'pptx') THEN 'PPT'");
            sql.append("   ELSE 'OTRO'");
            sql.append(" END) = ?");
            args.add(filter.fileType().name());
        }
        if (filter.unitId() != null) {
            sql.append(" AND COALESCE(pd.\"UNIDAD_ID\", cp.\"UNIDAD_ID\") = ?");
            args.add(filter.unitId());
        }
        if (filter.classId() != null) {
            sql.append(" AND pd.\"CLASE_ID\" = ?");
            args.add(filter.classId());
        }
        if (filter.subjectId() != null) {
            sql.append(" AND a.\"ID\" = ?");
            args.add(filter.subjectId());
        }
        if (filter.visibleToStudents() != null) {
            sql.append(" AND pd.\"VISIBLE_ALUMNOS\" = ?");
            args.add(filter.visibleToStudents());
        }

        sql.append(" ORDER BY pd.\"FECHA_CARGA\" DESC, pd.\"ID\" DESC");
        LOGGER.info("Consultando banco de documentos de planificacion para usuario={}", username);
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapDocument(rs), args.toArray());
    }

    @Override
    public Optional<PlanningDocument> findAccessibleById(String username, Long documentId) {
        PlanningDocumentFilter filter = new PlanningDocumentFilter(null, null, null, null, null);
        return findDocuments(username, filter).stream()
                .filter(document -> document.id().equals(documentId))
                .findFirst();
    }

    @Override
    public void markDeleted(Long documentId) {
        jdbcTemplate.update("""
                UPDATE "CLASES_PLANIFICACION_DOCUMENTOS"
                SET "ESTADO" = 'ELIMINADO',
                    "ELIMINADO" = TRUE
                WHERE "ID" = ?
                """, documentId);
    }

    private PlanningDocument mapDocument(ResultSet rs) throws SQLException {
        return new PlanningDocument(
                rs.getLong("ID"),
                readNullableLong(rs, "UNIDAD_ID"),
                readNullableLong(rs, "CLASE_ID"),
                rs.getString("NOMBRE_ORIGINAL"),
                rs.getString("NOMBRE_ARCHIVO"),
                rs.getString("EXTENSION"),
                rs.getString("MIME_TYPE"),
                rs.getLong("PESO_BYTES"),
                rs.getString("RUTA_ARCHIVO"),
                PlanningDocumentFileType.valueOf(rs.getString("file_type")),
                PlanningDocumentOrigin.valueOf(rs.getString("origin_type")),
                PlanningDocumentStatus.valueOf(rs.getString("status_code")),
                rs.getBoolean("VISIBLE_ALUMNOS"),
                rs.getTimestamp("FECHA_CARGA").toLocalDateTime(),
                readNullableLong(rs, "subject_id"),
                rs.getString("subject_name"),
                rs.getString("course_name"),
                resolveUnitNumberLabel(rs.getString("NUMERO_UNIDAD")),
                rs.getString("unit_name"),
                rs.getString("class_title"),
                rs.getString("created_by")
        );
    }

    private Long readNullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private String resolveUnitNumberLabel(String unitNumber) {
        if (unitNumber == null) {
            return "";
        }
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
}
