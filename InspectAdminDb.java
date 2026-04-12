import java.sql.*;

public class InspectAdminDb {
  public static void main(String[] args) throws Exception {
    Class.forName("org.postgresql.Driver");
    try (Connection c = DriverManager.getConnection("jdbc:postgresql://localhost:5432/sistema_escolar", "postgres", "1234")) {
      String[] queries = new String[] {
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%usuario%' OR table_name ILIKE '%rol%' OR table_name ILIKE '%audit%' OR table_name ILIKE '%perm%' OR table_name ILIKE '%persona%') ORDER BY table_name",
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='USUARIOS' ORDER BY ordinal_position",
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='PERSONAS' ORDER BY ordinal_position",
        "SELECT \"ID\", \"USUARIO\", \"PERSONA_ID\", \"ACTIVO\" FROM \"USUARIOS\" ORDER BY \"ID\"",
        "SELECT \"ID\", \"RUN\", \"NOMBRES\", \"APELLIDOS\", \"CORREO_ELECTRONICO\" FROM \"PERSONAS\" ORDER BY \"ID\" LIMIT 20"
      };
      for (String sql : queries) {
        System.out.println("--- " + sql);
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
          ResultSetMetaData md = rs.getMetaData();
          int cols = md.getColumnCount();
          while (rs.next()) {
            for (int i=1;i<=cols;i++) {
              System.out.print(md.getColumnLabel(i) + "=" + rs.getString(i));
              if (i < cols) System.out.print(" | ");
            }
            System.out.println();
          }
        }
      }
    }
  }
}
