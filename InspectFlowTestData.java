import java.sql.*;
public class InspectFlowTestData {
  public static void main(String[] args) throws Exception {
    Class.forName("org.postgresql.Driver");
    try (Connection c = DriverManager.getConnection("jdbc:postgresql://localhost:5432/sistema_escolar", "postgres", "1234")) {
      print(c, "teacherPerson", "SELECT \"ID\", \"RUN\", \"NOMBRES\", \"APELLIDOS\" FROM \"PERSONAS\" WHERE \"RUN\"='22.222.222-2'");
      print(c, "teacher", "SELECT \"ID\", \"PERSONA_ID\", \"CODIGO\" FROM \"PROFESORES\" WHERE \"PERSONA_ID\" IN (SELECT \"ID\" FROM \"PERSONAS\" WHERE \"RUN\"='22.222.222-2')");
      print(c, "user", "SELECT \"ID\", \"PERSONA_ID\", \"USUARIO\" FROM \"USUARIOS\" WHERE \"USUARIO\"='pprueba'");
      print(c, "student", "SELECT \"ID\", \"RUN\", \"NOMBRE\", \"APELLIDOS\" FROM \"ALUMNOS\" WHERE \"RUN\"='33.333.333-3'");
      print(c, "subject", "SELECT \"ID\", \"CODIGO\", \"NOMBRE\" FROM \"ASIGNATURAS\" WHERE \"CODIGO\"='PRB'");
      print(c, "enrollment", "SELECT \"ID\", \"ALUMNO_ID\", \"CURSO_ID\", \"ACTIVA\" FROM \"MATRICULAS\" WHERE \"ALUMNO_ID\" IN (SELECT \"ID\" FROM \"ALUMNOS\" WHERE \"RUN\"='33.333.333-3')");
      print(c, "courseStudents", "SELECT \"ID\", \"CURSO_ID\", \"ALUMNO_ID\" FROM \"CURSO_ALUMNOS\" WHERE \"ALUMNO_ID\" IN (SELECT \"ID\" FROM \"ALUMNOS\" WHERE \"RUN\"='33.333.333-3')");
      print(c, "loads", "SELECT \"ID\", \"PROFESOR_ID\", \"CURSO_ID\", \"ASIGNATURA_ID\" FROM \"CARGAS_DOCENTES\" WHERE \"PROFESOR_ID\" IN (SELECT p.\"ID\" FROM \"PROFESORES\" p JOIN \"PERSONAS\" pe ON pe.\"ID\"=p.\"PERSONA_ID\" WHERE pe.\"RUN\"='22.222.222-2')");
      print(c, "activity", "SELECT \"ID\", \"TITULO\" FROM \"ACTIVIDADES_ESCOLARES\" WHERE \"TITULO\"='Actividad integral de prueba'");
    }
  }
  private static void print(Connection c, String label, String sql) throws Exception {
    System.out.println("--" + label + "--");
    try (PreparedStatement ps = c.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
      ResultSetMetaData md = rs.getMetaData();
      int cols = md.getColumnCount();
      boolean any = false;
      while (rs.next()) {
        any = true;
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= cols; i++) {
          if (i > 1) sb.append('|');
          sb.append(md.getColumnName(i)).append('=').append(rs.getString(i));
        }
        System.out.println(sb);
      }
      if (!any) System.out.println("<none>");
    }
  }
}
