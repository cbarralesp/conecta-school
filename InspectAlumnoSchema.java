import java.sql.*;
public class InspectAlumnoSchema {
  public static void main(String[] args) throws Exception {
    String url = "jdbc:postgresql://localhost:5432/sistema_escolar";
    try (Connection c = DriverManager.getConnection(url, "postgres", "1234")) {
      try (PreparedStatement ps = c.prepareStatement("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ALUMNOS' ORDER BY ordinal_position")) {
        try (ResultSet rs = ps.executeQuery()) {
          while (rs.next()) {
            System.out.println(rs.getString(1) + " | " + rs.getString(2));
          }
        }
      }
    }
  }
}
