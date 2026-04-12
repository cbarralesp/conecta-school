import com.example.authhexagonal.application.service.AdministrationManagementService;
import com.example.authhexagonal.domain.model.*;
import com.example.authhexagonal.infrastructure.adapter.out.persistence.AdministrationJdbcAdapter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class AdministrationSmokeTest {
  public static void main(String[] args) {
    var ds = new DriverManagerDataSource();
    ds.setDriverClassName("org.postgresql.Driver");
    ds.setUrl("jdbc:postgresql://localhost:5432/sistema_escolar");
    ds.setUsername("postgres");
    ds.setPassword("1234");

    var jdbc = new JdbcTemplate(ds);
    var adapter = new AdministrationJdbcAdapter(jdbc);
    var service = new AdministrationManagementService(adapter, new BCryptPasswordEncoder());

    var overview = service.getUsersOverview(null, null, null);
    System.out.println("USERS=" + overview.users().size());
    System.out.println("ROLES_OPTIONS=" + overview.roles().size());
    System.out.println("SUMMARY=" + overview.summary().size());

    var roles = service.getRolesOverview();
    System.out.println("ROLE_CARDS=" + roles.roles().size());

    var matrix = service.getAccessMatrix();
    System.out.println("MATRIX_ROWS=" + matrix.rows().size());

    var audit = service.getAuditLogs(null, null, null);
    System.out.println("AUDIT_ITEMS=" + audit.items().size());

    var created = service.createUser(new AdministrationUserCommand(
      "Brenda",
      "Admin",
      "Temporal",
      "brenda.admin@tfs.cl",
      "23.555.555-5",
      "+56 9 7777 1111",
      "Activo",
      "SECRETARIA",
      "brenda123",
      true,
      false,
      null
    ), "nramirez");
    System.out.println("CREATED=" + created.email() + "|" + created.roleCode());

    service.blockUser(created.id(), "nramirez");
    System.out.println("BLOCKED_OK=" + service.findUserById(created.id()).status());

    service.unblockUser(created.id(), "nramirez");
    System.out.println("UNBLOCKED_OK=" + service.findUserById(created.id()).status());

    service.deleteUser(created.id(), "nramirez");
    System.out.println("DELETED_OK=" + service.findUserById(created.id()).status());
  }
}
