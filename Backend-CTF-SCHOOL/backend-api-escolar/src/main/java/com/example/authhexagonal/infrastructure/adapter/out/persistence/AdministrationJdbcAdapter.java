package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.AdministrationAccessMatrixRow;
import com.example.authhexagonal.domain.model.AdministrationAuditLogItem;
import com.example.authhexagonal.domain.model.AdministrationMetric;
import com.example.authhexagonal.domain.model.AdministrationPermissionBullet;
import com.example.authhexagonal.domain.model.AdministrationRoleCard;
import com.example.authhexagonal.domain.model.AdministrationRoleOption;
import com.example.authhexagonal.domain.model.AdministrationUserCommand;
import com.example.authhexagonal.domain.model.AdministrationUserDetail;
import com.example.authhexagonal.domain.model.AdministrationUserListItem;
import com.example.authhexagonal.domain.port.out.ManageAdministrationPort;
import com.example.authhexagonal.domain.port.out.RegisterSecurityAuditPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.StringJoiner;

@Component
public class AdministrationJdbcAdapter implements ManageAdministrationPort, RegisterSecurityAuditPort {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter DISPLAY_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DISPLAY_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    private final JdbcTemplate jdbcTemplate;

    public AdministrationJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<AdministrationMetric> summarizeUsers() {
        return jdbcTemplate.query("""
                SELECT
                    (SELECT COUNT(1) FROM "USUARIOS") AS total_users,
                    (SELECT COUNT(1)
                       FROM "ADMIN_USER_SETTINGS"
                      WHERE "ESTADO" = 'Activo') AS active_users,
                    (SELECT COUNT(1)
                       FROM "ADMIN_ROLES"
                      WHERE "ACTIVO" = TRUE) AS total_roles,
                    (SELECT COUNT(1)
                       FROM "ADMIN_USER_SETTINGS"
                      WHERE "ULTIMO_ACCESO_AT"::date = CURRENT_DATE) AS today_access
                """, (rs, rowNum) -> List.of(
                new AdministrationMetric("Total usuarios", rs.getInt("total_users"), "brand"),
                new AdministrationMetric("Activos", rs.getInt("active_users"), "success"),
                new AdministrationMetric("Roles definidos", rs.getInt("total_roles"), "brand"),
                new AdministrationMetric("Ult. acceso hoy", rs.getInt("today_access"), "warning")
        )).stream().findFirst().orElse(List.of());
    }

    @Override
    public List<AdministrationRoleOption> findRoleOptions() {
        return jdbcTemplate.query("""
                SELECT "CODIGO", "NOMBRE", "DESCRIPCION"
                FROM "ADMIN_ROLES"
                WHERE "ACTIVO" = TRUE
                ORDER BY "ORDEN_VISUAL"
                """, (rs, rowNum) -> new AdministrationRoleOption(
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getString("DESCRIPCION")
        ));
    }

    @Override
    public List<AdministrationUserListItem> findUsers(String search, String roleCode, String status) {
        List<Object> args = new ArrayList<>();
        StringBuilder sql = new StringBuilder("""
                SELECT
                    u."ID",
                    u."USUARIO",
                    p."NOMBRES",
                    p."APELLIDOS",
                    p."CORREO_ELECTRONICO",
                    p."RUN",
                    COALESCE(p."TELEFONO", '') AS "TELEFONO",
                    r."CODIGO" AS role_code,
                    r."NOMBRE" AS role_name,
                    aus."ULTIMO_ACCESO_AT",
                    aus."ESTADO",
                    TRUE AS can_delete
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                JOIN "ADMIN_ROLES" r ON r."ID" = aus."ROL_ID"
                WHERE 1 = 1
                """);

        String normalizedSearch = normalize(search);
        if (normalizedSearch != null) {
            sql.append("""
                     AND (
                         UPPER(p."NOMBRES" || ' ' || p."APELLIDOS") LIKE ?
                         OR UPPER(p."CORREO_ELECTRONICO") LIKE ?
                         OR UPPER(u."USUARIO") LIKE ?
                     )
                    """);
            String searchPattern = "%" + normalizedSearch + "%";
            args.add(searchPattern);
            args.add(searchPattern);
            args.add(searchPattern);
        }
        if (normalize(roleCode) != null) {
            sql.append(" AND r.\"CODIGO\" = ?");
            args.add(roleCode.trim().toUpperCase());
        }
        if (normalize(status) != null) {
            sql.append(" AND aus.\"ESTADO\" = ?");
            args.add(capitalize(status));
        }
        sql.append(" ORDER BY p.\"NOMBRES\", p.\"APELLIDOS\"");

        return jdbcTemplate.query(sql.toString(), userListMapper(), args.toArray());
    }

    @Override
    public Optional<AdministrationUserDetail> findUserById(Long userId) {
        return jdbcTemplate.query("""
                SELECT
                    u."ID",
                    u."USUARIO",
                    p."NOMBRES",
                    p."APELLIDOS",
                    p."CORREO_ELECTRONICO",
                    p."RUN",
                    COALESCE(p."TELEFONO", '') AS "TELEFONO",
                    r."CODIGO" AS role_code,
                    r."NOMBRE" AS role_name,
                    r."DESCRIPCION" AS role_description,
                    aus."ULTIMO_ACCESO_AT",
                    aus."ESTADO",
                    aus."FORZAR_CAMBIO_CLAVE",
                    aus."REQUIERE_2FA",
                    aus."VIGENCIA_HASTA",
                    TRUE AS can_delete
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                JOIN "ADMIN_ROLES" r ON r."ID" = aus."ROL_ID"
                WHERE u."ID" = ?
                """, (rs, rowNum) -> toUserDetail(rs), userId).stream().findFirst();
    }

    @Override
    public AdministrationUserDetail createUser(AdministrationUserCommand command, String encodedPassword) {
        Long personId = insertPerson(command);
        Long userId = insertUser(personId, deriveUsername(command.email()), encodedPassword, !"Inactivo".equalsIgnoreCase(command.initialStatus()));
        insertUserSettings(userId, command);
        return findUserById(userId).orElseThrow();
    }

    @Override
    public AdministrationUserDetail updateUser(Long userId, AdministrationUserCommand command, String encodedPasswordOrNull) {
        Long personId = jdbcTemplate.queryForObject("SELECT \"PERSONA_ID\" FROM \"USUARIOS\" WHERE \"ID\" = ?", Long.class, userId);
        updatePerson(personId, command);
        updateUserRecord(userId, command, encodedPasswordOrNull);
        updateUserSettings(userId, command);
        return findUserById(userId).orElseThrow();
    }

    @Override
    public void setBlocked(Long userId, boolean blocked) {
        jdbcTemplate.update("""
                UPDATE "ADMIN_USER_SETTINGS"
                SET "ESTADO" = ?, "ACTUALIZADO_AT" = CURRENT_TIMESTAMP
                WHERE "USUARIO_ID" = ?
                """, blocked ? "Bloqueado" : "Activo", userId);
        if (!blocked) {
            jdbcTemplate.update("UPDATE \"USUARIOS\" SET \"ACTIVO\" = TRUE WHERE \"ID\" = ?", userId);
        }
    }

    @Override
    public void setActive(Long userId, boolean active) {
        jdbcTemplate.update("UPDATE \"USUARIOS\" SET \"ACTIVO\" = ? WHERE \"ID\" = ?", active, userId);
        jdbcTemplate.update("""
                UPDATE "ADMIN_USER_SETTINGS"
                SET "ESTADO" = ?, "ACTUALIZADO_AT" = CURRENT_TIMESTAMP
                WHERE "USUARIO_ID" = ?
                """, active ? "Activo" : "Inactivo", userId);
    }

    @Override
    public void deleteUser(Long userId) {
        jdbcTemplate.update("UPDATE \"USUARIOS\" SET \"ACTIVO\" = FALSE WHERE \"ID\" = ?", userId);
        jdbcTemplate.update("""
                UPDATE "ADMIN_USER_SETTINGS"
                SET "ESTADO" = 'Inactivo', "ACTUALIZADO_AT" = CURRENT_TIMESTAMP
                WHERE "USUARIO_ID" = ?
                """, userId);
    }

    @Override
    public boolean existsRun(String run, Long excludeUserId) {
        StringBuilder sql = new StringBuilder("""
                SELECT COUNT(1)
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                WHERE UPPER(p."RUN") = UPPER(?)
                """);
        List<Object> args = new ArrayList<>(List.of(run));
        if (excludeUserId != null) {
            sql.append(" AND u.\"ID\" <> ?");
            args.add(excludeUserId);
        }
        Integer count = jdbcTemplate.queryForObject(sql.toString(), Integer.class, args.toArray());
        return count != null && count > 0;
    }

    @Override
    public boolean existsEmail(String email, Long excludeUserId) {
        StringBuilder sql = new StringBuilder("""
                SELECT COUNT(1)
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                WHERE UPPER(p."CORREO_ELECTRONICO") = UPPER(?)
                """);
        List<Object> args = new ArrayList<>(List.of(email));
        if (excludeUserId != null) {
            sql.append(" AND u.\"ID\" <> ?");
            args.add(excludeUserId);
        }
        Integer count = jdbcTemplate.queryForObject(sql.toString(), Integer.class, args.toArray());
        return count != null && count > 0;
    }

    @Override
    public boolean existsUsername(String username, Long excludeUserId) {
        StringBuilder sql = new StringBuilder("""
                SELECT COUNT(1)
                FROM "USUARIOS"
                WHERE UPPER("USUARIO") = UPPER(?)
                """);
        List<Object> args = new ArrayList<>(List.of(username));
        if (excludeUserId != null) {
            sql.append(" AND \"ID\" <> ?");
            args.add(excludeUserId);
        }
        Integer count = jdbcTemplate.queryForObject(sql.toString(), Integer.class, args.toArray());
        return count != null && count > 0;
    }

    @Override
    public List<AdministrationRoleCard> findRoleCards() {
        List<AdministrationRoleCard> roles = jdbcTemplate.query("""
                SELECT
                    r."CODIGO",
                    r."NOMBRE",
                    r."DESCRIPCION",
                    r."NIVEL_LABEL",
                    r."RESUMEN_ALCANCE",
                    COUNT(aus."ID") AS user_count
                FROM "ADMIN_ROLES" r
                LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."ROL_ID" = r."ID"
                WHERE r."ACTIVO" = TRUE
                GROUP BY r."ID", r."CODIGO", r."NOMBRE", r."DESCRIPCION", r."NIVEL_LABEL", r."RESUMEN_ALCANCE", r."ORDEN_VISUAL"
                ORDER BY r."ORDEN_VISUAL"
                """, (rs, rowNum) -> new AdministrationRoleCard(
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                rs.getString("DESCRIPCION"),
                rs.getLong("user_count"),
                rs.getString("NIVEL_LABEL"),
                rs.getString("RESUMEN_ALCANCE"),
                List.of()
        ));

        return roles.stream()
                .map(role -> new AdministrationRoleCard(
                        role.code(),
                        role.name(),
                        role.description(),
                        role.userCount(),
                        role.levelLabel(),
                        role.scopeSummary(),
                        findRolePermissions(role.code())
                ))
                .toList();
    }

    @Override
    public List<AdministrationPermissionBullet> findRolePermissions(String roleCode) {
        return jdbcTemplate.query("""
                SELECT s."DESCRIPCION", s."ESTADO"
                FROM "ADMIN_ROLE_PERMISSION_SUMMARIES" s
                JOIN "ADMIN_ROLES" r ON r."ID" = s."ROL_ID"
                WHERE r."CODIGO" = ?
                ORDER BY s."ORDEN_VISUAL"
                """, (rs, rowNum) -> new AdministrationPermissionBullet(
                rs.getString("DESCRIPCION"),
                rs.getString("ESTADO")
        ), roleCode);
    }

    @Override
    public List<AdministrationAccessMatrixRow> findAccessMatrixRows() {
        return jdbcTemplate.query("""
                SELECT
                    a."MODULO_CODIGO",
                    a."MODULO_NOMBRE",
                    a."NIVEL_ACCESO",
                    a."ORDEN_VISUAL",
                    r."CODIGO" AS role_code
                FROM "ADMIN_ROLE_MODULE_ACCESS" a
                JOIN "ADMIN_ROLES" r ON r."ID" = a."ROL_ID"
                ORDER BY a."ORDEN_VISUAL", r."ORDEN_VISUAL"
                """, rs -> {
            Map<String, Map<String, String>> permissionsByModule = new LinkedHashMap<>();
            Map<String, String> namesByModule = new LinkedHashMap<>();
            while (rs.next()) {
                String moduleCode = rs.getString("MODULO_CODIGO");
                permissionsByModule.computeIfAbsent(moduleCode, key -> new LinkedHashMap<>())
                        .put(rs.getString("role_code"), rs.getString("NIVEL_ACCESO"));
                namesByModule.putIfAbsent(moduleCode, rs.getString("MODULO_NOMBRE"));
            }
            List<AdministrationAccessMatrixRow> rows = new ArrayList<>();
            permissionsByModule.forEach((moduleCode, permissions) ->
                    rows.add(new AdministrationAccessMatrixRow(namesByModule.get(moduleCode), permissions)));
            return rows;
        });
    }

    @Override
    public List<AdministrationAuditLogItem> findAuditLogs(String type, String user, LocalDate dateStart, LocalDate dateEnd) {
        List<Object> args = new ArrayList<>();
        StringBuilder sql = new StringBuilder("""
                SELECT
                    logs."ID",
                    logs."OCURRIDO_AT",
                    logs."TIPO",
                    logs."NOMBRE_USUARIO",
                    logs."ACCION",
                    logs."CONTEXTO",
                    COALESCE(roles."NOMBRE",
                        CASE
                            WHEN logs."USUARIO_ID" IS NULL THEN 'Sistema'
                            ELSE 'Sin rol'
                        END
                    ) AS "ROL_NOMBRE"
                FROM "ADMIN_AUDIT_LOGS" logs
                LEFT JOIN "ADMIN_USER_SETTINGS" settings ON settings."USUARIO_ID" = logs."USUARIO_ID"
                LEFT JOIN "ADMIN_ROLES" roles ON roles."ID" = settings."ROL_ID"
                WHERE 1 = 1
                """);

        if (normalize(type) != null) {
            sql.append(" AND logs.\"TIPO\" = ?");
            args.add(type.trim().toUpperCase());
        }
        if (normalize(user) != null) {
            sql.append(" AND UPPER(logs.\"NOMBRE_USUARIO\") LIKE ?");
            args.add("%" + user.trim().toUpperCase() + "%");
        }
        if (dateStart != null) {
            sql.append(" AND logs.\"OCURRIDO_AT\"::date >= ?");
            args.add(Date.valueOf(dateStart));
        }
        if (dateEnd != null) {
            sql.append(" AND logs.\"OCURRIDO_AT\"::date <= ?");
            args.add(Date.valueOf(dateEnd));
        }
        sql.append(" ORDER BY logs.\"OCURRIDO_AT\" DESC");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            LocalDateTime occurredAt = rs.getTimestamp("OCURRIDO_AT").toLocalDateTime();
            return new AdministrationAuditLogItem(
                    rs.getLong("ID"),
                    occurredAt.format(DATE_TIME_FORMATTER),
                    buildRelativeDateLabel(occurredAt),
                    rs.getString("TIPO"),
                    rs.getString("NOMBRE_USUARIO"),
                    rs.getString("ROL_NOMBRE"),
                    rs.getString("ACCION"),
                    rs.getString("CONTEXTO")
            );
        }, args.toArray());
    }

    @Override
    public List<String> findAuditUserOptions() {
        return jdbcTemplate.query("""
                SELECT DISTINCT "NOMBRE_USUARIO"
                FROM "ADMIN_AUDIT_LOGS"
                ORDER BY "NOMBRE_USUARIO"
                """, (rs, rowNum) -> rs.getString("NOMBRE_USUARIO"));
    }

    @Override
    public void recordAuditEvent(String actorUsername, String type, String actionLabel, String context, LocalDateTime occurredAt) {
        Long userId = findUserIdByUsername(actorUsername).orElse(null);
        String actorDisplay = resolveDisplayName(actorUsername);
        jdbcTemplate.update("""
                INSERT INTO "ADMIN_AUDIT_LOGS" ("USUARIO_ID", "NOMBRE_USUARIO", "TIPO", "ACCION", "CONTEXTO", "OCURRIDO_AT")
                VALUES (?, ?, ?, ?, ?, ?)
                """, userId, actorDisplay, type, actionLabel, context, Timestamp.valueOf(occurredAt));
    }

    @Override
    public void registerSuccessfulLogin(String username) {
        findUserIdByUsername(username).ifPresent(userId -> {
            jdbcTemplate.update("""
                    UPDATE "ADMIN_USER_SETTINGS"
                    SET "ULTIMO_ACCESO_AT" = CURRENT_TIMESTAMP,
                        "ACTUALIZADO_AT" = CURRENT_TIMESTAMP
                    WHERE "USUARIO_ID" = ?
                    """, userId);
            recordAuditEvent(username, "LOGIN", "Inicio sesion en el sistema", "Acceso autenticado correctamente", LocalDateTime.now());
        });
    }

    @Override
    public void registerFailedLogin(String username) {
        jdbcTemplate.update("""
                INSERT INTO "ADMIN_AUDIT_LOGS" ("USUARIO_ID", "NOMBRE_USUARIO", "TIPO", "ACCION", "CONTEXTO", "OCURRIDO_AT")
                VALUES (NULL, 'Sistema Admin', 'FAILED_ATTEMPT', 'Intento de acceso fallido', ?, CURRENT_TIMESTAMP)
                """, "Usuario: " + (username == null || username.isBlank() ? "desconocido" : username.trim()));
    }

    private RowMapper<AdministrationUserListItem> userListMapper() {
        return (rs, rowNum) -> new AdministrationUserListItem(
                rs.getLong("ID"),
                rs.getString("USUARIO"),
                rs.getString("NOMBRES") + " " + rs.getString("APELLIDOS"),
                rs.getString("CORREO_ELECTRONICO"),
                rs.getString("RUN"),
                rs.getString("TELEFONO"),
                rs.getString("role_code"),
                rs.getString("role_name"),
                readLocalDateTime(rs.getTimestamp("ULTIMO_ACCESO_AT")),
                buildLastAccessLabel(readLocalDateTime(rs.getTimestamp("ULTIMO_ACCESO_AT"))),
                rs.getString("ESTADO"),
                rs.getBoolean("can_delete")
        );
    }

    private AdministrationUserDetail toUserDetail(java.sql.ResultSet rs) throws java.sql.SQLException {
        LocalDateTime lastAccessAt = readLocalDateTime(rs.getTimestamp("ULTIMO_ACCESO_AT"));
        String[] lastNames = splitLastNames(rs.getString("APELLIDOS"));
        return new AdministrationUserDetail(
                rs.getLong("ID"),
                rs.getString("USUARIO"),
                rs.getString("NOMBRES") + " " + rs.getString("APELLIDOS"),
                rs.getString("CORREO_ELECTRONICO"),
                rs.getString("RUN"),
                rs.getString("TELEFONO"),
                rs.getString("role_code"),
                rs.getString("role_name"),
                lastAccessAt,
                buildLastAccessLabel(lastAccessAt),
                rs.getString("ESTADO"),
                rs.getBoolean("can_delete"),
                rs.getString("NOMBRES"),
                lastNames[0],
                lastNames[1],
                rs.getString("role_description"),
                rs.getBoolean("FORZAR_CAMBIO_CLAVE"),
                rs.getBoolean("REQUIERE_2FA"),
                readLocalDate(rs.getDate("VIGENCIA_HASTA"))
        );
    }

    private Long insertPerson(AdministrationUserCommand command) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO "PERSONAS" (
                        "RUN", "NOMBRES", "APELLIDOS", "CORREO_ELECTRONICO", "TELEFONO", "DIRECCION"
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """, new String[]{"ID"});
            ps.setString(1, command.run());
            ps.setString(2, command.firstName().trim());
            ps.setString(3, buildLastNames(command));
            ps.setString(4, command.email().trim().toLowerCase());
            ps.setString(5, command.phone().trim());
            ps.setString(6, null);
            return ps;
        }, keyHolder);
        return keyHolder.getKeyAs(Long.class);
    }

    private Long insertUser(Long personId, String username, String encodedPassword, boolean active) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO "USUARIOS" ("PERSONA_ID", "USUARIO", "CLAVE", "ACTIVO")
                    VALUES (?, ?, ?, ?)
                    """, new String[]{"ID"});
            ps.setLong(1, personId);
            ps.setString(2, username);
            ps.setString(3, encodedPassword);
            ps.setBoolean(4, active);
            return ps;
        }, keyHolder);
        return keyHolder.getKeyAs(Long.class);
    }

    private void insertUserSettings(Long userId, AdministrationUserCommand command) {
        jdbcTemplate.update("""
                INSERT INTO "ADMIN_USER_SETTINGS" (
                    "USUARIO_ID", "ROL_ID", "ESTADO", "FORZAR_CAMBIO_CLAVE", "REQUIERE_2FA", "VIGENCIA_HASTA", "ELIMINABLE"
                )
                VALUES (?, (SELECT "ID" FROM "ADMIN_ROLES" WHERE "CODIGO" = ?), ?, ?, ?, ?, TRUE)
                """,
                userId,
                command.roleCode().trim().toUpperCase(),
                normalizeStatus(command.initialStatus()),
                command.forcePasswordChange(),
                command.twoFactorRequired(),
                command.accountExpiresAt() == null ? null : Date.valueOf(command.accountExpiresAt())
        );
    }

    private void updatePerson(Long personId, AdministrationUserCommand command) {
        jdbcTemplate.update("""
                UPDATE "PERSONAS"
                SET "RUN" = ?,
                    "NOMBRES" = ?,
                    "APELLIDOS" = ?,
                    "CORREO_ELECTRONICO" = ?,
                    "TELEFONO" = ?
                WHERE "ID" = ?
                """,
                command.run(),
                command.firstName().trim(),
                buildLastNames(command),
                command.email().trim().toLowerCase(),
                command.phone().trim(),
                personId
        );
    }

    private void updateUserRecord(Long userId, AdministrationUserCommand command, String encodedPasswordOrNull) {
        String username = deriveUsername(command.email());
        if (encodedPasswordOrNull == null) {
            jdbcTemplate.update("""
                    UPDATE "USUARIOS"
                    SET "USUARIO" = ?, "ACTIVO" = ?
                    WHERE "ID" = ?
                    """,
                    username,
                    !"Inactivo".equalsIgnoreCase(command.initialStatus()),
                    userId
            );
            return;
        }

        jdbcTemplate.update("""
                UPDATE "USUARIOS"
                SET "USUARIO" = ?, "CLAVE" = ?, "ACTIVO" = ?
                WHERE "ID" = ?
                """,
                username,
                encodedPasswordOrNull,
                !"Inactivo".equalsIgnoreCase(command.initialStatus()),
                userId
        );
    }

    private void updateUserSettings(Long userId, AdministrationUserCommand command) {
        jdbcTemplate.update("""
                UPDATE "ADMIN_USER_SETTINGS"
                SET "ROL_ID" = (SELECT "ID" FROM "ADMIN_ROLES" WHERE "CODIGO" = ?),
                    "ESTADO" = ?,
                    "FORZAR_CAMBIO_CLAVE" = ?,
                    "REQUIERE_2FA" = ?,
                    "VIGENCIA_HASTA" = ?,
                    "ACTUALIZADO_AT" = CURRENT_TIMESTAMP
                WHERE "USUARIO_ID" = ?
                """,
                command.roleCode().trim().toUpperCase(),
                normalizeStatus(command.initialStatus()),
                command.forcePasswordChange(),
                command.twoFactorRequired(),
                command.accountExpiresAt() == null ? null : Date.valueOf(command.accountExpiresAt()),
                userId
        );
    }

    public Optional<String> findEffectiveRoleCodeByUsername(String username) {
        return jdbcTemplate.query("""
                SELECT r."CODIGO"
                FROM "USUARIOS" u
                LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                LEFT JOIN "ADMIN_ROLES" r ON r."ID" = aus."ROL_ID"
                WHERE UPPER(u."USUARIO") = UPPER(?)
                """, (rs, rowNum) -> rs.getString("CODIGO"), username).stream().findFirst();
    }

    public Optional<AuthenticatedAdminUser> findAuthenticationUser(String username) {
        List<AuthenticatedAdminUser> users = jdbcTemplate.query("""
                SELECT
                    u."ID" AS user_id,
                    u."USUARIO",
                    u."CLAVE",
                    u."ACTIVO",
                    COALESCE(p."CORREO_ELECTRONICO", '') AS email,
                    TRIM(COALESCE(p."NOMBRES", '') || ' ' || COALESCE(p."APELLIDOS", '')) AS display_name,
                    COALESCE(r."CODIGO", 'PROFESOR') AS role_code,
                    COALESCE(aus."ESTADO", CASE WHEN u."ACTIVO" THEN 'Activo' ELSE 'Inactivo' END) AS estado
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                LEFT JOIN "ADMIN_USER_SETTINGS" aus ON aus."USUARIO_ID" = u."ID"
                LEFT JOIN "ADMIN_ROLES" r ON r."ID" = aus."ROL_ID"
                WHERE UPPER(u."USUARIO") = UPPER(?)
                   OR UPPER(COALESCE(p."CORREO_ELECTRONICO", '')) = UPPER(?)
                """, (rs, rowNum) -> new AuthenticatedAdminUser(
                rs.getLong("user_id"),
                rs.getString("USUARIO"),
                rs.getString("email"),
                rs.getString("display_name"),
                rs.getString("CLAVE"),
                rs.getBoolean("ACTIVO"),
                rs.getString("role_code"),
                rs.getString("estado")
        ), username, username);
        return users.stream().findFirst();
    }

    private Optional<Long> findUserIdByUsername(String username) {
        return jdbcTemplate.query("""
                SELECT "ID"
                FROM "USUARIOS"
                WHERE UPPER("USUARIO") = UPPER(?)
                """, (rs, rowNum) -> rs.getLong("ID"), username).stream().findFirst();
    }

    private String resolveDisplayName(String username) {
        return jdbcTemplate.query("""
                SELECT p."NOMBRES" || ' ' || p."APELLIDOS"
                FROM "USUARIOS" u
                JOIN "PERSONAS" p ON p."ID" = u."PERSONA_ID"
                WHERE UPPER(u."USUARIO") = UPPER(?)
                """, (rs, rowNum) -> rs.getString(1), username).stream().findFirst().orElse("Sistema Admin");
    }

    private String buildLastAccessLabel(LocalDateTime lastAccessAt) {
        if (lastAccessAt == null) {
            return "Sin acceso";
        }
        LocalDate today = LocalDate.now();
        if (lastAccessAt.toLocalDate().isEqual(today)) {
            return "Hoy " + lastAccessAt.format(DISPLAY_TIME_FORMATTER);
        }
        if (lastAccessAt.toLocalDate().isEqual(today.minusDays(1))) {
            return "Ayer " + lastAccessAt.format(DISPLAY_TIME_FORMATTER);
        }
        return lastAccessAt.format(DISPLAY_DATE_FORMATTER);
    }

    private String buildRelativeDateLabel(LocalDateTime occurredAt) {
        LocalDate today = LocalDate.now();
        if (occurredAt.toLocalDate().isEqual(today)) {
            return "Hoy " + occurredAt.format(DISPLAY_TIME_FORMATTER);
        }
        if (occurredAt.toLocalDate().isEqual(today.minusDays(1))) {
            return "Ayer " + occurredAt.format(DISPLAY_TIME_FORMATTER);
        }
        return occurredAt.format(DISPLAY_DATE_FORMATTER);
    }

    private String[] splitLastNames(String lastNames) {
        if (lastNames == null || lastNames.isBlank()) {
            return new String[]{"", ""};
        }
        String[] pieces = lastNames.trim().split("\\s+", 2);
        if (pieces.length == 1) {
            return new String[]{pieces[0], ""};
        }
        return new String[]{pieces[0], pieces[1]};
    }

    private String buildLastNames(AdministrationUserCommand command) {
        StringJoiner joiner = new StringJoiner(" ");
        if (command.paternalLastName() != null && !command.paternalLastName().isBlank()) {
            joiner.add(command.paternalLastName().trim());
        }
        if (command.maternalLastName() != null && !command.maternalLastName().isBlank()) {
            joiner.add(command.maternalLastName().trim());
        }
        return joiner.toString();
    }

    private String deriveUsername(String email) {
        int atIndex = email.indexOf('@');
        return (atIndex > 0 ? email.substring(0, atIndex) : email).trim().toLowerCase();
    }

    private String normalize(String value) {
        return value == null || value.trim().isBlank() ? null : value.trim().toUpperCase();
    }

    private String normalizeStatus(String value) {
        if (value == null || value.isBlank()) {
            return "Activo";
        }
        return capitalize(value);
    }

    private String capitalize(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase();
        if (normalized.isBlank()) {
            return normalized;
        }
        return Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1);
    }

    private LocalDateTime readLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private LocalDate readLocalDate(Date value) {
        return value == null ? null : value.toLocalDate();
    }

    public record AuthenticatedAdminUser(
            Long id,
            String username,
            String email,
            String displayName,
            String encodedPassword,
            boolean active,
            String roleCode,
            String status
    ) {
    }
}
