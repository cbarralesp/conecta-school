import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class QueryPlanningDocuments {
    public static void main(String[] args) throws Exception {
        Class.forName("org.postgresql.Driver");
        try (Connection connection = DriverManager.getConnection(
                "jdbc:postgresql://localhost:5432/sistema_escolar",
                "postgres",
                "1234"
        );
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery("""
                     SELECT
                         d."ID",
                         d."NOMBRE_ORIGINAL",
                         d."TIPO_ARCHIVO",
                         d."VISIBLE_ALUMNOS",
                         COALESCE(up."NUMERO_UNIDAD", '') AS unidad,
                         COALESCE(a."NOMBRE", '') AS asignatura,
                         COALESCE(cp."TITULO", '') AS clase
                     FROM "CLASES_PLANIFICACION_DOCUMENTOS" d
                     LEFT JOIN "CLASES_PLANIFICACION" cp ON cp."ID" = d."CLASE_ID"
                     LEFT JOIN "UNIDADES_PLANIFICACION" up ON up."ID" = COALESCE(d."UNIDAD_ID", cp."UNIDAD_ID")
                     LEFT JOIN "CARGAS_DOCENTES" cd ON cd."ID" = up."CARGA_DOCENTE_ID"
                     LEFT JOIN "ASIGNATURAS" a ON a."ID" = cd."ASIGNATURA_ID"
                     WHERE COALESCE(d."ELIMINADO", FALSE) = FALSE
                     ORDER BY d."ID"
                     """)) {
            while (resultSet.next()) {
                System.out.println(
                        resultSet.getLong("ID") + " | "
                                + resultSet.getString("NOMBRE_ORIGINAL") + " | "
                                + resultSet.getString("TIPO_ARCHIVO") + " | visible="
                                + resultSet.getBoolean("VISIBLE_ALUMNOS") + " | "
                                + resultSet.getString("unidad") + " | "
                                + resultSet.getString("asignatura") + " | "
                                + resultSet.getString("clase")
                );
            }
        }
    }
}
