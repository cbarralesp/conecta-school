import java.sql.*;
public class InspectCourseText {
  public static void main(String[] args) throws Exception {
    Class.forName("org.postgresql.Driver");
    try (Connection c = DriverManager.getConnection("jdbc:postgresql://localhost:5432/sistema_escolar", "postgres", "1234")) {
      print(c, "SELECT \"ID\", \"CODIGO\", \"NOMBRE\", \"NIVEL\" FROM \"CURSOS\" WHERE \"NOMBRE\" LIKE '%' || chr(194) || '%' OR \"NOMBRE\" LIKE '%' || chr(195) || '%' OR \"NIVEL\" LIKE '%' || chr(194) || '%' OR \"NIVEL\" LIKE '%' || chr(195) || '%' ORDER BY \"ID\"");
      print(c, "SELECT \"ID\", \"CODIGO\", \"DESCRIPCION\" FROM \"CURSOS_MAESTROS\" WHERE \"DESCRIPCION\" LIKE '%' || chr(194) || '%' OR \"DESCRIPCION\" LIKE '%' || chr(195) || '%' ORDER BY \"ID\"");
    }
  }
  private static void print(Connection c, String sql) throws Exception {
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
