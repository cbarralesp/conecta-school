import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class QueryPlanningDocumentsAdapter {
    public static void main(String[] args) throws Exception {
        Class.forName("org.postgresql.Driver");
        try (Connection connection = DriverManager.getConnection(
                "jdbc:postgresql://localhost:5432/sistema_escolar",
                "postgres",
                "1234"
        );
             PreparedStatement statement = connection.prepareStatement("""
                     WITH current_user AS (
                         SELECT
                             u."PERSONA_ID" AS persona_id,
                             COALESCE(ar."CODIGO", 'PROFESOR') AS role_code
                         FROM "USUARIOS" u
                         LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                         LEFT JOIN "ADMIN_ROLES" ar ON ar."ID" = aus."ROL_ID"
                         WHERE u."USUARIO" = ?
                     )
                     SELECT
                         pd."ID",
                         pd."UNIDAD_ID",
                         pd."CLASE_ID",
                         pd."NOMBRE_ORIGINAL",
                         pd."NOMBRE_ARCHIVO",
                         pd."EXTENSION",
                         pd."MIME_TYPE",
                         pd."PESO_BYTES",
                         pd."RUTA_ARCHIVO",
                         COALESCE(pd."TIPO_ARCHIVO", CASE
                             WHEN LOWER(pd."EXTENSION") IN ('doc', 'docx') THEN 'WORD'
                             WHEN LOWER(pd."EXTENSION") = 'pdf' THEN 'PDF'
                             WHEN LOWER(pd."EXTENSION") IN ('ppt', 'pptx') THEN 'PPT'
                             ELSE 'OTRO'
                         END) AS file_type,
                         CASE WHEN pd."CLASE_ID" IS NOT NULL THEN 'CLASE' ELSE 'UNIDAD' END AS origin_type,
                         COALESCE(pd."ESTADO", 'ACTIVO') AS status_code,
                         pd."VISIBLE_ALUMNOS",
                         pd."FECHA_CARGA",
                         a."ID" AS subject_id,
                         a."NOMBRE" AS subject_name,
                         c."NOMBRE" AS course_name,
                         up."NUMERO_UNIDAD",
                         up."NOMBRE" AS unit_name,
                         COALESCE(cp."TITULO", '') AS class_title,
                         COALESCE(creator."USUARIO", '') AS created_by
                     FROM current_user cu
                     JOIN "CLASES_PLANIFICACION_DOCUMENTOS" pd ON 1 = 1
                     LEFT JOIN "CLASES_PLANIFICACION" cp ON cp."ID" = pd."CLASE_ID"
                     LEFT JOIN "UNIDADES_PLANIFICACION" up ON up."ID" = COALESCE(pd."UNIDAD_ID", cp."UNIDAD_ID")
                     LEFT JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                     LEFT JOIN "PROFESORES" pr ON pr."ID" = cd."PROFESOR_ID"
                     LEFT JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                     LEFT JOIN "CURSOS" c ON c."ID" = cd."CURSO_ID"
                     LEFT JOIN "USUARIOS" creator ON creator."ID" = pd."CREADO_POR_USUARIO_ID"
                     WHERE COALESCE(pd."ELIMINADO", FALSE) = FALSE
                       AND COALESCE(pd."ESTADO", 'ACTIVO') = 'ACTIVO'
                       AND (
                             cu.role_code IN ('SUPERADMIN', 'DIRECTOR', 'INSPECTOR', 'SECRETARIA')
                             OR pr."PERSONA_ID" = cu.persona_id
                       )
                     ORDER BY pd."FECHA_CARGA" DESC, pd."ID" DESC
                     """)) {
            statement.setString(1, "mgonzalez");
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    System.out.println(rs.getLong("ID") + " | " + rs.getString("NOMBRE_ORIGINAL"));
                }
            }
        }
    }
}
