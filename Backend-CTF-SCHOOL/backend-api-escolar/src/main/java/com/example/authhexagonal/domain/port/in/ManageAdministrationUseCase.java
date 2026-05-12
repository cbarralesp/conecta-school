package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.AdministrationAccessMatrix;
import com.example.authhexagonal.domain.model.AdministrationAccessMatrixUpdateCommand;
import com.example.authhexagonal.domain.model.AdministrationAuditLogView;
import com.example.authhexagonal.domain.model.AdministrationCurrentModuleAccess;
import com.example.authhexagonal.domain.model.AdministrationRoleOption;
import com.example.authhexagonal.domain.model.AdministrationRolesOverview;
import com.example.authhexagonal.domain.model.AdministrationUserCommand;
import com.example.authhexagonal.domain.model.AdministrationUserDetail;
import com.example.authhexagonal.domain.model.AdministrationUsersOverview;

import java.time.LocalDate;
import java.util.List;

public interface ManageAdministrationUseCase {

    AdministrationUsersOverview getUsersOverview(String search, String roleCode, String status);

    AdministrationUserDetail findUserById(Long userId);

    AdministrationUserDetail createUser(AdministrationUserCommand command, String actorUsername);

    AdministrationUserDetail updateUser(Long userId, AdministrationUserCommand command, String actorUsername);

    void blockUser(Long userId, String actorUsername);

    void unblockUser(Long userId, String actorUsername);

    void setActiveState(Long userId, boolean active, String actorUsername);

    void deleteUser(Long userId, String actorUsername);

    AdministrationRolesOverview getRolesOverview();

    List<AdministrationRoleOption> getRoleOptions();

    AdministrationAccessMatrix getAccessMatrix();

    AdministrationCurrentModuleAccess getCurrentModuleAccess(String username);

    void saveAccessMatrix(AdministrationAccessMatrixUpdateCommand command, String actorUsername);

    AdministrationAuditLogView getAuditLogs(String type, String user, LocalDate dateStart, LocalDate dateEnd);

    byte[] exportAuditLogs(String type, String user, LocalDate dateStart, LocalDate dateEnd);
}
