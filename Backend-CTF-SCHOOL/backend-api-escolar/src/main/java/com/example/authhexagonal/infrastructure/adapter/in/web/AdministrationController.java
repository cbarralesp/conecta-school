package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.model.AdministrationAccessMatrix;
import com.example.authhexagonal.domain.model.AdministrationAuditLogView;
import com.example.authhexagonal.domain.model.AdministrationRoleOption;
import com.example.authhexagonal.domain.model.AdministrationRolesOverview;
import com.example.authhexagonal.domain.model.AdministrationUserDetail;
import com.example.authhexagonal.domain.model.AdministrationUsersOverview;
import com.example.authhexagonal.domain.port.in.ManageAdministrationUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.AdministrationAccessMatrixRequest;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.AdministrationUserRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdministrationController {

    private final ManageAdministrationUseCase manageAdministrationUseCase;

    public AdministrationController(ManageAdministrationUseCase manageAdministrationUseCase) {
        this.manageAdministrationUseCase = manageAdministrationUseCase;
    }

    @GetMapping("/users")
    public AdministrationUsersOverview getUsers(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "roleCode", required = false) String roleCode,
            @RequestParam(name = "status", required = false) String status
    ) {
        return manageAdministrationUseCase.getUsersOverview(search, roleCode, status);
    }

    @GetMapping("/users/{userId}")
    public AdministrationUserDetail getUserById(@PathVariable("userId") Long userId) {
        return manageAdministrationUseCase.findUserById(userId);
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public AdministrationUserDetail createUser(
            @Valid @RequestBody AdministrationUserRequest request,
            Authentication authentication
    ) {
        return manageAdministrationUseCase.createUser(request.toDomain(), authentication.getName());
    }

    @PutMapping("/users/{userId}")
    public AdministrationUserDetail updateUser(
            @PathVariable("userId") Long userId,
            @Valid @RequestBody AdministrationUserRequest request,
            Authentication authentication
    ) {
        return manageAdministrationUseCase.updateUser(userId, request.toDomain(), authentication.getName());
    }

    @PatchMapping("/users/{userId}/block")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void blockUser(@PathVariable("userId") Long userId, Authentication authentication) {
        manageAdministrationUseCase.blockUser(userId, authentication.getName());
    }

    @PatchMapping("/users/{userId}/unblock")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unblockUser(@PathVariable("userId") Long userId, Authentication authentication) {
        manageAdministrationUseCase.unblockUser(userId, authentication.getName());
    }

    @PatchMapping("/users/{userId}/active")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setActiveState(
            @PathVariable("userId") Long userId,
            @RequestParam(name = "value") boolean value,
            Authentication authentication
    ) {
        manageAdministrationUseCase.setActiveState(userId, value, authentication.getName());
    }

    @DeleteMapping("/users/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable("userId") Long userId, Authentication authentication) {
        manageAdministrationUseCase.deleteUser(userId, authentication.getName());
    }

    @GetMapping("/roles")
    public AdministrationRolesOverview getRoles() {
        return manageAdministrationUseCase.getRolesOverview();
    }

    @GetMapping("/roles/options")
    public List<AdministrationRoleOption> getRoleOptions() {
        return manageAdministrationUseCase.getRoleOptions();
    }

    @GetMapping("/access-matrix")
    public AdministrationAccessMatrix getAccessMatrix() {
        return manageAdministrationUseCase.getAccessMatrix();
    }

    @PutMapping("/access-matrix")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveAccessMatrix(
            @RequestBody AdministrationAccessMatrixRequest request,
            Authentication authentication
    ) {
        manageAdministrationUseCase.saveAccessMatrix(request.toDomain(), authentication.getName());
    }

    @GetMapping("/audit-logs")
    public AdministrationAuditLogView getAuditLogs(
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "user", required = false) String user,
            @RequestParam(name = "dateStart", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateStart,
            @RequestParam(name = "dateEnd", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateEnd
    ) {
        return manageAdministrationUseCase.getAuditLogs(type, user, dateStart, dateEnd);
    }

    @GetMapping("/audit-logs/export")
    public ResponseEntity<byte[]> exportAuditLogs(
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "user", required = false) String user,
            @RequestParam(name = "dateStart", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateStart,
            @RequestParam(name = "dateEnd", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateEnd
    ) {
        byte[] body = manageAdministrationUseCase.exportAuditLogs(type, user, dateStart, dateEnd);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=auditoria-sistema.csv")
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .body(body);
    }
}
