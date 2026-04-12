import java.sql.*;
public class DiagnoseStudentDashboardQueries {
  private static final String URL = "jdbc:postgresql://localhost:5432/sistema_escolar";
  public static void main(String[] args) throws Exception {
    try (Connection c = DriverManager.getConnection(URL, "postgres", "1234")) {
      long studentId = 30L;
      run(c, "student lookup", "SELECT a.\"ID\" AS student_id, a.\"RUN\" AS student_run, TRIM(a.\"NOMBRE\" || ' ' || a.\"APELLIDOS\") AS student_name FROM \"USUARIOS\" u JOIN \"PERSONAS\" p ON p.\"ID\" = u.\"PERSONA_ID\" JOIN \"ALUMNOS\" a ON UPPER(a.\"RUN\") = UPPER(p.\"RUN\") WHERE UPPER(u.\"USUARIO\") = UPPER(?) OR UPPER(COALESCE(p.\"CORREO_ELECTRONICO\", '')) = UPPER(?)", "bprueba", "bprueba");
      run(c, "courses", "SELECT m.\"ID\" AS enrollment_id, c.\"NOMBRE\" AS course_name, c.\"CODIGO\" AS course_code, m.\"ESTADO\" AS enrollment_status FROM \"MATRICULAS\" m JOIN \"CURSOS\" c ON c.\"ID\" = m.\"CURSO_ID\" WHERE m.\"ALUMNO_ID\" = ? AND m.\"ACTIVA\" = TRUE ORDER BY c.\"ANIO_ESCOLAR\" DESC, c.\"NOMBRE\"", studentId);
      run(c, "schedule", "SELECT DISTINCT bh.\"DIA_SEMANA\" AS day_of_week, bh.\"HORA_INICIO\" AS start_time, bh.\"HORA_FIN\" AS end_time, c.\"NOMBRE\" AS course_name, a.\"NOMBRE\" AS subject_name, COALESCE(hc.\"SALA\", 'Sala por confirmar') AS room FROM \"MATRICULAS\" m JOIN \"CURSOS\" c ON c.\"ID\" = m.\"CURSO_ID\" JOIN \"CARGAS_DOCENTES\" cd ON cd.\"CURSO_ID\" = c.\"ID\" AND cd.\"ACTIVA\" = TRUE JOIN \"HORARIOS_CARGAS\" hc ON hc.\"CARGA_DOCENTE_ID\" = cd.\"ID\" JOIN \"BLOQUES_HORARIOS\" bh ON bh.\"ID\" = hc.\"BLOQUE_HORARIO_ID\" AND bh.\"ACTIVO\" = TRUE JOIN \"ASIGNATURAS\" a ON a.\"ID\" = cd.\"ASIGNATURA_ID\" AND a.\"ACTIVA\" = TRUE WHERE m.\"ALUMNO_ID\" = ? AND m.\"ACTIVA\" = TRUE ORDER BY CASE bh.\"DIA_SEMANA\" WHEN 'LUNES' THEN 1 WHEN 'MARTES' THEN 2 WHEN 'MIERCOLES' THEN 3 WHEN 'JUEVES' THEN 4 WHEN 'VIERNES' THEN 5 ELSE 6 END, bh.\"HORA_INICIO\"", studentId);
      run(c, "grades", "SELECT s.\"NOMBRE\" AS subject_name, e.\"NOMBRE\" AS evaluation_name, cal.\"NOTA\" AS score, p.\"NOMBRE\" AS period_name, COALESCE(cal.\"ACTUALIZADO_EN\", cal.\"CREADO_EN\") AS recorded_at FROM \"CALIFICACIONES\" cal JOIN \"EVALUACIONES\" e ON e.\"ID\" = cal.\"EVALUACION_ID\" AND e.\"ACTIVA\" = TRUE JOIN \"ASIGNATURAS\" s ON s.\"ID\" = e.\"ASIGNATURA_ID\" AND s.\"ACTIVA\" = TRUE JOIN \"PERIODOS_ACADEMICOS\" p ON p.\"ID\" = e.\"PERIODO_ID\" AND p.\"ACTIVO\" = TRUE WHERE cal.\"ALUMNO_ID\" = ? AND cal.\"ACTIVA\" = TRUE AND cal.\"NOTA\" IS NOT NULL ORDER BY COALESCE(cal.\"ACTUALIZADO_EN\", cal.\"CREADO_EN\") DESC, e.\"ORDEN\" DESC LIMIT 6", studentId);
      run(c, "attendance", "SELECT COUNT(1) FILTER (WHERE ad.\"ESTADO\" = 'PRESENTE') AS present_count, COUNT(1) FILTER (WHERE ad.\"ESTADO\" = 'ATRASO') AS late_count, COUNT(1) FILTER (WHERE ad.\"ESTADO\" = 'AUSENTE') AS absent_count, COUNT(1) AS total_count FROM \"ASISTENCIA_DETALLES\" ad JOIN \"ASISTENCIA_REGISTROS\" ar ON ar.\"ID\" = ad.\"REGISTRO_ID\" AND ar.\"ACTIVO\" = TRUE WHERE ad.\"ALUMNO_ID\" = ? AND ad.\"ACTIVO\" = TRUE", studentId);
      run(c, "activities", "SELECT a.\"ID\", a.\"TITULO\", t.\"NOMBRE\" AS activity_type_name, a.\"FECHA\", COALESCE(a.\"UBICACION\", 'Sin ubicacion definida') AS location FROM \"ACTIVIDADES_ESCOLARES\" a JOIN \"TIPOS_ACTIVIDAD\" t ON t.\"ID\" = a.\"TIPO_ACTIVIDAD_ID\" WHERE a.\"ACTIVO\" = TRUE AND t.\"ACTIVO\" = TRUE AND COALESCE(a.\"FECHA_FIN\", a.\"FECHA\") >= CURRENT_DATE ORDER BY a.\"FECHA\", a.\"HORA\" NULLS LAST, a.\"TITULO\" LIMIT 4");
    }
  }
  static void run(Connection c, String label, String sql, Object... params) {
    try (PreparedStatement ps = c.prepareStatement(sql)) {
      for (int i = 0; i < params.length; i++) ps.setObject(i+1, params[i]);
      try (ResultSet rs = ps.executeQuery()) {
        int count = 0;
        ResultSetMetaData md = rs.getMetaData();
        while (rs.next()) {
          count++;
          StringBuilder sb = new StringBuilder();
          for (int i = 1; i <= md.getColumnCount(); i++) {
            if (i > 1) sb.append(" | ");
            sb.append(md.getColumnLabel(i)).append('=').append(rs.getObject(i));
          }
          System.out.println(label + " -> " + sb);
        }
        if (count == 0) System.out.println(label + " -> 0 rows");
      }
    } catch (Exception e) {
      System.out.println(label + " -> ERROR: " + e.getMessage());
    }
  }
}
