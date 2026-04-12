import java.sql.*;
public class VerifySeedState {
  public static void main(String[] args) throws Exception {
    Class.forName("org.postgresql.Driver");
    try (Connection c = DriverManager.getConnection("jdbc:postgresql://localhost:5432/sistema_escolar", "postgres", "1234")) {
      printCount(c, "SELECT COUNT(1) FROM \"PROFESORES\" p JOIN \"PERSONAS\" pe ON pe.\"ID\"=p.\"PERSONA_ID\" WHERE pe.\"RUN\"='22.222.222-2'", "teacher");
      printCount(c, "SELECT COUNT(1) FROM \"ALUMNOS\" WHERE \"RUN\"='33.333.333-3'", "student");
      printCount(c, "SELECT COUNT(1) FROM \"ASIGNATURAS\" WHERE \"CODIGO\"='PRB'", "subject");
      printCount(c, "SELECT COUNT(1) FROM \"MATRICULAS\" m JOIN \"ALUMNOS\" a ON a.\"ID\"=m.\"ALUMNO_ID\" WHERE a.\"RUN\"='33.333.333-3' AND m.\"ACTIVA\"=TRUE", "enrollment");
      printCount(c, "SELECT COUNT(1) FROM \"CARGAS_DOCENTES\" cd JOIN \"PROFESORES\" p ON p.\"ID\"=cd.\"PROFESOR_ID\" JOIN \"PERSONAS\" pe ON pe.\"ID\"=p.\"PERSONA_ID\" JOIN \"ASIGNATURAS\" s ON s.\"ID\"=cd.\"ASIGNATURA_ID\" WHERE pe.\"RUN\"='22.222.222-2' AND s.\"CODIGO\"='PRB' AND cd.\"ACTIVA\"=TRUE", "load");
      printCount(c, "SELECT COUNT(1) FROM \"ACTIVIDADES_ESCOLARES\" WHERE \"TITULO\"='Actividad integral de prueba'", "activity");
      printCount(c, "SELECT COUNT(1) FROM \"CURSOS\" WHERE \"CODIGO\" IN ('4A-2026','4B-2026','CUR-4A-2026','CUR-4B-2026')", "tempCourses");
    }
  }
  private static void printCount(Connection c, String sql, String label) throws Exception {
    try (PreparedStatement ps = c.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
      rs.next();
      System.out.println(label + "=" + rs.getInt(1));
    }
  }
}
