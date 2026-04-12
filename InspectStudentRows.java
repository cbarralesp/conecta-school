import java.sql.*;
public class InspectStudentRows {
  public static void main(String[] args) throws Exception {
    String url = "jdbc:postgresql://localhost:5432/sistema_escolar";
    try (Connection c = DriverManager.getConnection(url, "postgres", "1234")) {
      try (PreparedStatement ps = c.prepareStatement("SELECT \"ID\", \"RUN\", \"NOMBRE\", \"APELLIDOS\" FROM \"ALUMNOS\" WHERE UPPER(\"RUN\") = UPPER(?)")) {
        ps.setString(1, "33.333.333-3");
        try (ResultSet rs = ps.executeQuery()) {
          while (rs.next()) {
            System.out.println(rs.getLong(1) + " | " + rs.getString(2) + " | " + rs.getString(3) + " | " + rs.getString(4));
          }
        }
      }
    }
  }
}
