package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.exception.ResourceNotFoundException;
import com.example.authhexagonal.domain.model.AdministrationAccessMatrix;
import com.example.authhexagonal.domain.model.AdministrationAccessMatrixUpdateCommand;
import com.example.authhexagonal.domain.model.AdministrationAuditLogItem;
import com.example.authhexagonal.domain.model.AdministrationAuditLogView;
import com.example.authhexagonal.domain.model.AdministrationCurrentModuleAccess;
import com.example.authhexagonal.domain.model.AdministrationOptionItem;
import com.example.authhexagonal.domain.model.AdministrationRoleCard;
import com.example.authhexagonal.domain.model.AdministrationRoleOption;
import com.example.authhexagonal.domain.model.AdministrationRolesOverview;
import com.example.authhexagonal.domain.model.AdministrationUserCommand;
import com.example.authhexagonal.domain.model.AdministrationUserDetail;
import com.example.authhexagonal.domain.model.AdministrationUsersOverview;
import com.example.authhexagonal.domain.model.AdministrationUserModuleOverride;
import com.example.authhexagonal.domain.port.in.ManageAdministrationUseCase;
import com.example.authhexagonal.domain.port.out.ManageAdministrationPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AdministrationManagementService implements ManageAdministrationUseCase {

    private final ManageAdministrationPort manageAdministrationPort;
    private final PasswordEncoder passwordEncoder;

    public AdministrationManagementService(
            ManageAdministrationPort manageAdministrationPort,
            PasswordEncoder passwordEncoder
    ) {
        this.manageAdministrationPort = manageAdministrationPort;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public AdministrationUsersOverview getUsersOverview(String search, String roleCode, String status) {
        return new AdministrationUsersOverview(
                manageAdministrationPort.summarizeUsers(),
                manageAdministrationPort.findRoleOptions(),
                manageAdministrationPort.findUsers(search, roleCode, status)
        );
    }

    @Override
    public AdministrationUserDetail findUserById(Long userId) {
        return manageAdministrationPort.findUserById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Administration user not found"));
    }

    @Override
    public AdministrationUserDetail createUser(AdministrationUserCommand command, String actorUsername) {
        validateUniqueness(command, null);
        AdministrationUserDetail created = manageAdministrationPort.createUser(command, passwordEncoder.encode(resolvePassword(command)));
        manageAdministrationPort.recordAuditEvent(
                actorUsername,
                "CREATE",
                "Creo un nuevo usuario",
                created.email() + " con rol " + created.roleName(),
                LocalDateTime.now()
        );
        return created;
    }

    @Override
    public AdministrationUserDetail updateUser(Long userId, AdministrationUserCommand command, String actorUsername) {
        findUserById(userId);
        validateUniqueness(command, userId);
        String encodedPassword = hasTemporaryPassword(command) ? passwordEncoder.encode(command.temporaryPassword().trim()) : null;
        AdministrationUserDetail updated = manageAdministrationPort.updateUser(userId, command, encodedPassword);
        manageAdministrationPort.recordAuditEvent(
                actorUsername,
                "ROLE_CHANGE",
                "Actualizo configuracion de usuario",
                updated.email() + " ahora usa rol " + updated.roleName(),
                LocalDateTime.now()
        );
        return updated;
    }

    @Override
    public void blockUser(Long userId, String actorUsername) {
        AdministrationUserDetail user = findUserById(userId);
        manageAdministrationPort.setBlocked(userId, true);
        manageAdministrationPort.recordAuditEvent(
                actorUsername,
                "BLOCK",
                "Bloqueo una cuenta",
                user.email() + " (" + user.roleName() + ")",
                LocalDateTime.now()
        );
    }

    @Override
    public void unblockUser(Long userId, String actorUsername) {
        AdministrationUserDetail user = findUserById(userId);
        manageAdministrationPort.setBlocked(userId, false);
        manageAdministrationPort.recordAuditEvent(
                actorUsername,
                "ROLE_CHANGE",
                "Desbloqueo una cuenta",
                user.email() + " (" + user.roleName() + ")",
                LocalDateTime.now()
        );
    }

    @Override
    public void setActiveState(Long userId, boolean active, String actorUsername) {
        AdministrationUserDetail user = findUserById(userId);
        manageAdministrationPort.setActive(userId, active);
        manageAdministrationPort.recordAuditEvent(
                actorUsername,
                "ROLE_CHANGE",
                active ? "Activo una cuenta" : "Desactivo una cuenta",
                user.email() + " (" + user.roleName() + ")",
                LocalDateTime.now()
        );
    }

    @Override
    @Transactional
    public void deleteUser(Long userId, String actorUsername) {
        AdministrationUserDetail user = findUserById(userId);
        manageAdministrationPort.deleteUser(userId);
        manageAdministrationPort.recordAuditEvent(
                actorUsername,
                "BLOCK",
                "Elimino un usuario",
                user.email() + " fue removido del sistema",
                LocalDateTime.now()
        );
    }

    @Override
    public AdministrationRolesOverview getRolesOverview() {
        List<AdministrationRoleCard> roles = manageAdministrationPort.findRoleCards();
        return new AdministrationRolesOverview(roles);
    }

    @Override
    public List<AdministrationRoleOption> getRoleOptions() {
        return manageAdministrationPort.findRoleOptions();
    }

    @Override
    public AdministrationAccessMatrix getAccessMatrix() {
        return new AdministrationAccessMatrix(
                manageAdministrationPort.findRoleOptions(),
                manageAdministrationPort.findAccessMatrixRows(),
                manageAdministrationPort.findUserModuleOverrides()
        );
    }

    @Override
    public AdministrationCurrentModuleAccess getCurrentModuleAccess(String username) {
        return manageAdministrationPort.findCurrentModuleAccess(username);
    }

    @Override
    @Transactional
    public void saveAccessMatrix(AdministrationAccessMatrixUpdateCommand command, String actorUsername) {
        manageAdministrationPort.replaceAccessMatrixRows(command.rows());
        manageAdministrationPort.replaceUserModuleOverrides(command.userOverrides());
        long roleChanges = command.rows().stream()
                .mapToLong(row -> row.permissions().size())
                .sum();
        long overrideCount = command.userOverrides().size();
        manageAdministrationPort.recordAuditEvent(
                actorUsername,
                "ROLE_CHANGE",
                "Actualizo la matriz de accesos",
                roleChanges + " permisos de rol y " + overrideCount + " excepciones por usuario",
                LocalDateTime.now()
        );
    }

    @Override
    public AdministrationAuditLogView getAuditLogs(String type, String user, LocalDate dateStart, LocalDate dateEnd) {
        return new AdministrationAuditLogView(
                List.of(
                        new AdministrationOptionItem("", "Todas las acciones"),
                        new AdministrationOptionItem("LOGIN", "Inicio de sesion"),
                        new AdministrationOptionItem("CREATE", "Creacion"),
                        new AdministrationOptionItem("ROLE_CHANGE", "Cambio de rol"),
                        new AdministrationOptionItem("BLOCK", "Bloqueo"),
                        new AdministrationOptionItem("FAILED_ATTEMPT", "Intento fallido"),
                        new AdministrationOptionItem("LOGOUT", "Cierre de sesion")
                ),
                buildUserOptions(),
                manageAdministrationPort.findAuditLogs(type, user, dateStart, dateEnd)
        );
    }

    @Override
    public byte[] exportAuditLogs(String type, String user, LocalDate dateStart, LocalDate dateEnd) {
        List<AdministrationAuditLogItem> items = manageAdministrationPort.findAuditLogs(type, user, dateStart, dateEnd);
        StringBuilder csv = new StringBuilder();
        csv.append("\"Fecha\",\"Usuario\",\"Rol\",\"Accion\",\"Contexto\"\n");
        for (AdministrationAuditLogItem item : items) {
            csv.append('"').append(escape(item.occurredAt())).append("\",")
                    .append('"').append(escape(item.userDisplay())).append("\",")
                    .append('"').append(escape(item.roleName())).append("\",")
                    .append('"').append(escape(item.actionLabel())).append("\",")
                    .append('"').append(escape(item.context())).append("\"\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<AdministrationOptionItem> buildUserOptions() {
        return manageAdministrationPort.findAuditUserOptions().stream()
                .map(value -> new AdministrationOptionItem(value, value))
                .toList();
    }

    private void validateUniqueness(AdministrationUserCommand command, Long excludeUserId) {
        if (manageAdministrationPort.existsRun(command.run(), excludeUserId)) {
            throw new IllegalArgumentException("RUN already exists");
        }
        if (manageAdministrationPort.existsEmail(command.email(), excludeUserId)) {
            throw new IllegalArgumentException("Email already exists");
        }
        String username = resolveUsername(command);
        if (manageAdministrationPort.existsUsername(username, excludeUserId)) {
            throw new IllegalArgumentException("Username already exists");
        }
    }

    private String deriveUsername(String email) {
        int atIndex = email.indexOf('@');
        return atIndex > 0 ? email.substring(0, atIndex).trim().toLowerCase() : email.trim().toLowerCase();
    }

    private String resolveUsername(AdministrationUserCommand command) {
        if (command.username() != null && !command.username().trim().isBlank()) {
            return command.username().trim().toLowerCase();
        }
        return deriveUsername(command.email());
    }

    private String resolvePassword(AdministrationUserCommand command) {
        return hasTemporaryPassword(command) ? command.temporaryPassword().trim() : "Welcome123!";
    }

    private boolean hasTemporaryPassword(AdministrationUserCommand command) {
        return command.temporaryPassword() != null && !command.temporaryPassword().trim().isBlank();
    }

    private String escape(String value) {
        return value == null ? "" : value.replace("\"", "\"\"");
    }
}
