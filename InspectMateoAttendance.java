import java.sql.*;
public class InspectMateoAttendance {
  public static void main(String[] args) throws Exception {
    String url = "jdbc:postgresql://localhost:5432/sistema_escolar";
    try (Connection c = DriverManager.getConnection(url, "postgres", "1234")) {
      String sql = """
        SELECT ad."ESTADO", COUNT(1)
        FROM "ASISTENCIA_DETALLES" ad
        JOIN "ASISTENCIA_REGISTROS" ar ON ar."ID" = ad."REGISTRO_ID" AND ar."ACTIVO" = TRUE
        WHERE ad."ALUMNO_ID" = 19
          AND ad."ACTIVO" = TRUE
        GROUP BY ad."ESTADO"
        ORDER BY ad."ESTADO"
      """;
      try (PreparedStatement ps = c.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          System.out.println(rs.getString(1) + " | " + rs.getInt(2));
        }
      }
    }
  }
}
