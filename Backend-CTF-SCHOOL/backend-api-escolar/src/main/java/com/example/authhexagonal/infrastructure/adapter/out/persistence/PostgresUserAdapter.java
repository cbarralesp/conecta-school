package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.AuthUser;
import com.example.authhexagonal.domain.port.out.LoadUserPort;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
public class PostgresUserAdapter implements LoadUserPort {

    private final AdministrationJdbcAdapter administrationJdbcAdapter;

    public PostgresUserAdapter(AdministrationJdbcAdapter administrationJdbcAdapter) {
        this.administrationJdbcAdapter = administrationJdbcAdapter;
    }

    @Override
    public Optional<AuthUser> findByUsername(String username) {
        return administrationJdbcAdapter.findAuthenticationUser(username)
                .filter(user -> user.active())
                .filter(user -> !"Bloqueado".equalsIgnoreCase(user.status()))
                .filter(user -> !"Inactivo".equalsIgnoreCase(user.status()))
                .map(user -> new AuthUser(
                        user.id(),
                        user.username(),
                        user.email(),
                        user.displayName(),
                        user.roleCode(),
                        mapApplicationRole(user.roleCode()),
                        user.encodedPassword(),
                        buildAuthorities(user.roleCode())
                ));
    }

    private String mapApplicationRole(String roleCode) {
        String normalizedRoleCode = normalizeRoleCode(roleCode);
        return switch (normalizedRoleCode) {
            case "PROFESOR" -> "TEACHER";
            case "ALUMNO", "STUDENT", "APODERADO" -> "STUDENT";
            default -> "ADMIN";
        };
    }

    private List<String> buildAuthorities(String roleCode) {
        String normalizedRoleCode = normalizeRoleCode(roleCode);
        String applicationRole = mapApplicationRole(normalizedRoleCode);
        List<String> authorities = new ArrayList<>();
        authorities.add("ROLE_" + normalizedRoleCode);
        String applicationAuthority = "ROLE_" + applicationRole;
        if (!authorities.contains(applicationAuthority)) {
            authorities.add(applicationAuthority);
        }
        return List.copyOf(authorities);
    }

    private String normalizeRoleCode(String roleCode) {
        if (roleCode == null || roleCode.isBlank()) {
            return "PROFESOR";
        }
        return roleCode.trim().toUpperCase();
    }
}
