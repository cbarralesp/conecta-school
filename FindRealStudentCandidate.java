import java.sql.*;
public class FindRealStudentCandidate {
  public static void main(String[] args) throws Exception {
    String url = "jdbc:postgresql://localhost:5432/sistema_escolar";
    try (Connection c = DriverManager.getConnection(url, "postgres", "1234")) {
      String sql = """
        SELECT a."ID", a."RUN", a."NOMBRE", a."APELLIDOS", m."ID" AS matricula_id, c."NOMBRE" AS curso, c."CODIGO"
        FROM "ALUMNOS" a
        LEFT JOIN "MATRICULAS" m ON m."ALUMNO_ID" = a."ID" AND m."ACTIVA" = TRUE
        LEFT JOIN "CURSOS" c ON c."ID" = m."CURSO_ID"
        WHERE a."ACTIVO" = TRUE
        ORDER BY a."ID"
        LIMIT 20
      """;
      try (PreparedStatement ps = c.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          System.out.println(rs.getLong("ID") + " | " + rs.getString("RUN") + " | " + rs.getString("NOMBRE") + " | " + rs.getString("APELLIDOS") + " | matricula=" + rs.getObject("matricula_id") + " | curso=" + rs.getString("curso") + " | codigo=" + rs.getString("CODIGO"));
        }
      }
    }
  }
}
