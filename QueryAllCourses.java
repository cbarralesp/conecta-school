import java.sql.*;
public class QueryAllCourses {
  public static void main(String[] args) throws Exception {
    Class.forName("org.postgresql.Driver");
    String url = "jdbc:postgresql://localhost:5432/sistema_escolar";
    try (Connection c = DriverManager.getConnection(url, "postgres", "1234");
         PreparedStatement ps = c.prepareStatement("SELECT \"ID\", \"CODIGO\", \"NOMBRE\", \"NIVEL\", \"LETRA\", \"ANIO_ESCOLAR\", \"JORNADA\", \"ACTIVO\" FROM \"CURSOS\" WHERE \"ACTIVO\" = TRUE ORDER BY \"ANIO_ESCOLAR\", \"NIVEL\", \"LETRA\"")) {
      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          System.out.println(rs.getLong("ID")+"|"+rs.getString("CODIGO")+"|"+rs.getString("NOMBRE")+"|"+rs.getString("NIVEL")+"|"+rs.getString("LETRA")+"|"+rs.getInt("ANIO_ESCOLAR")+"|"+rs.getString("JORNADA")+"|"+rs.getBoolean("ACTIVO"));
        }
      }
    }
  }
}
