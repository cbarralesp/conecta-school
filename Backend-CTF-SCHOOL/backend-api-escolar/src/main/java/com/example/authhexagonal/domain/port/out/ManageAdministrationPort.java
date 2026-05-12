package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.AdministrationAccessMatrixRow;
import com.example.authhexagonal.domain.model.AdministrationCurrentModuleAccess;
import com.example.authhexagonal.domain.model.AdministrationAuditLogItem;
import com.example.authhexagonal.domain.model.AdministrationMetric;
import com.example.authhexagonal.domain.model.AdministrationPermissionBullet;
import com.example.authhexagonal.domain.model.AdministrationRoleCard;
import com.example.authhexagonal.domain.model.AdministrationRoleOption;
import com.example.authhexagonal.domain.model.AdministrationUserCommand;
import com.example.authhexagonal.domain.model.AdministrationUserDetail;
import com.example.authhexagonal.domain.model.AdministrationUserListItem;
import com.example.authhexagonal.domain.model.AdministrationUserModuleOverride;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ManageAdministrationPort {

    List<AdministrationMetric> summarizeUsers();

    List<AdministrationRoleOption> findRoleOptions();

    List<AdministrationUserListItem> findUsers(String search, String roleCode, String status);

    Optional<AdministrationUserDetail> findUserById(Long userId);

    AdministrationUserDetail createUser(AdministrationUserCommand command, String encodedPassword);

    AdministrationUserDetail updateUser(Long userId, AdministrationUserCommand command, String encodedPasswordOrNull);

    void setBlocked(Long userId, boolean blocked);

    void setActive(Long userId, boolean active);

    void deleteUser(Long userId);

    boolean existsRun(String run, Long excludeUserId);

    boolean existsEmail(String email, Long excludeUserId);

    boolean existsUsername(String username, Long excludeUserId);

    List<AdministrationRoleCard> findRoleCards();

    List<AdministrationPermissionBullet> findRolePermissions(String roleCode);

    List<AdministrationAccessMatrixRow> findAccessMatrixRows();

    List<AdministrationUserModuleOverride> findUserModuleOverrides();

    AdministrationCurrentModuleAccess findCurrentModuleAccess(String username);

    void replaceAccessMatrixRows(List<AdministrationAccessMatrixRow> rows);

    void replaceUserModuleOverrides(List<AdministrationUserModuleOverride> overrides);

    List<AdministrationAuditLogItem> findAuditLogs(String type, String user, LocalDate dateStart, LocalDate dateEnd);

    List<String> findAuditUserOptions();

    void recordAuditEvent(String actorUsername, String type, String actionLabel, String context, LocalDateTime occurredAt);
}
