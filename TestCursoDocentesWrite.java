import java.sql.*;
public class TestCursoDocentesWrite {
  public static void main(String[] args) throws Exception {
    Class.forName("org.postgresql.Driver");
    try (Connection c = DriverManager.getConnection("jdbc:postgresql://localhost:5432/sistema_escolar", "postgres", "1234")) {
      try (PreparedStatement ps = c.prepareStatement("UPDATE \"CURSO_DOCENTES\" SET \"PROFESOR_ID\"=?, \"ASISTENTE_ID\"=NULL WHERE \"CURSO_ID\"=?")) {
        ps.setLong(1, 10L);
        ps.setLong(2, 7L);
        int updated = ps.executeUpdate();
        System.out.println("updated=" + updated);
      }
    }
  }
}
