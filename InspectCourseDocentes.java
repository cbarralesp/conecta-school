import java.sql.*;
public class InspectCourseDocentes {
  public static void main(String[] args) throws Exception {
    Class.forName("org.postgresql.Driver");
    try (Connection c = DriverManager.getConnection("jdbc:postgresql://localhost:5432/sistema_escolar", "postgres", "1234");
         PreparedStatement ps = c.prepareStatement("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='CURSO_DOCENTES' ORDER BY ordinal_position")) {
      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          System.out.println(rs.getString(1) + "|" + rs.getString(2));
        }
      }
    }
  }
}
