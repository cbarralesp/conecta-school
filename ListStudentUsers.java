import java.sql.*;
public class ListStudentUsers {
  public static void main(String[] args) throws Exception {
    String url = "jdbc:postgresql://localhost:5432/sistema_escolar";
    try (Connection c = DriverManager.getConnection(url, "postgres", "1234")) {
      String sql = """
        SELECT u."ID", u."USUARIO", p."CORREO_ELECTRONICO", p."RUN", p."NOMBRES", p."APELLIDOS", r."CODIGO", aus."ESTADO"
        FROM "USUARIOS" u
        JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
        JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
        JOIN "ADMIN_ROLES" r ON r."ID" = aus."ROL_ID"
        WHERE r."CODIGO" IN ('ALUMNO','STUDENT')
        ORDER BY p."NOMBRES", p."APELLIDOS"
      """;
      try (PreparedStatement ps = c.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          System.out.println(rs.getLong(1)+" | "+rs.getString(2)+" | "+rs.getString(3)+" | "+rs.getString(4)+" | "+rs.getString(5)+" | "+rs.getString(6)+" | "+rs.getString(7)+" | "+rs.getString(8));
        }
      }
    }
  }
}
