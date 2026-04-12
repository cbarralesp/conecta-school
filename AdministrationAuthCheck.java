import com.example.authhexagonal.infrastructure.adapter.out.persistence.AdministrationJdbcAdapter;
import com.example.authhexagonal.infrastructure.adapter.out.persistence.PostgresUserAdapter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

public class AdministrationAuthCheck {
  public static void main(String[] args) {
    var ds = new DriverManagerDataSource();
    ds.setDriverClassName("org.postgresql.Driver");
    ds.setUrl("jdbc:postgresql://localhost:5432/sistema_escolar");
    ds.setUsername("postgres");
    ds.setPassword("1234");
    var adapter = new PostgresUserAdapter(new AdministrationJdbcAdapter(new JdbcTemplate(ds)));
    var user = adapter.findByUsername("nramirez").orElseThrow();
    System.out.println(user.username() + "|" + user.roles());
    var blocked = adapter.findByUsername("jvera");
    System.out.println("JVERA_PRESENT=" + blocked.isPresent());
  }
}
