import java.sql.*;

public class InspectAdministrationData {
  public static void main(String[] args) throws Exception {
    Class.forName("org.postgresql.Driver");
    try (Connection c = DriverManager.getConnection("jdbc:postgresql://localhost:5432/sistema_escolar", "postgres", "1234")) {
      String[] queries = new String[] {
        "SELECT \"CODIGO\", \"NOMBRE\" FROM \"ADMIN_ROLES\" ORDER BY \"ORDEN_VISUAL\"",
        "SELECT u.\"USUARIO\", p.\"NOMBRES\", p.\"APELLIDOS\", r.\"CODIGO\", aus.\"ESTADO\" FROM \"ADMIN_USER_SETTINGS\" aus JOIN \"USUARIOS\" u ON u.\"ID\"=aus.\"USUARIO_ID\" JOIN \"PERSONAS\" p ON p.\"ID\"=u.\"PERSONA_ID\" JOIN \"ADMIN_ROLES\" r ON r.\"ID\"=aus.\"ROL_ID\" ORDER BY u.\"USUARIO\"",
        "SELECT \"TIPO\", \"ACCION\", \"NOMBRE_USUARIO\" FROM \"ADMIN_AUDIT_LOGS\" ORDER BY \"OCURRIDO_AT\" DESC LIMIT 8"
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
