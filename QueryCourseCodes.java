import java.sql.*;
public class QueryCourseCodes {
  public static void main(String[] args) throws Exception {
    Class.forName("org.postgresql.Driver");
    String url = "jdbc:postgresql://localhost:5432/sistema_escolar";
    try (Connection c = DriverManager.getConnection(url, "postgres", "1234");
         PreparedStatement ps = c.prepareStatement("SELECT \"ID\", \"CODIGO\", \"NOMBRE\", \"ACTIVO\" FROM \"CURSOS\" WHERE UPPER(\"CODIGO\") LIKE ? ORDER BY \"ID\"")) {
      ps.setString(1, "%4A%");
      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          System.out.println(rs.getLong(1)+"|"+rs.getString(2)+"|"+rs.getString(3)+"|"+rs.getBoolean(4));
        }
      }
    }
  }
}
