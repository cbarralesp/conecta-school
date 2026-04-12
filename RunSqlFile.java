import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class RunSqlFile {
    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            throw new IllegalArgumentException("Usage: RunSqlFile <sql-file>");
        }

        Class.forName("org.postgresql.Driver");
        String sql = Files.readString(Path.of(args[0]));

        try (Connection connection = DriverManager.getConnection(
                "jdbc:postgresql://localhost:5432/sistema_escolar",
                "postgres",
                "1234"
        );
             Statement statement = connection.createStatement()) {
            statement.execute(sql);
            System.out.println("OK");
        }
    }
}
