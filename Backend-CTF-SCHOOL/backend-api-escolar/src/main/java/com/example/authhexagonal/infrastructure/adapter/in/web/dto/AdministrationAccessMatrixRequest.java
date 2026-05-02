package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.AdministrationAccessMatrixRow;
import com.example.authhexagonal.domain.model.AdministrationAccessMatrixUpdateCommand;
import com.example.authhexagonal.domain.model.AdministrationUserModuleOverride;

import java.util.List;
import java.util.Map;

public record AdministrationAccessMatrixRequest(
        List<RowRequest> rows,
        List<UserOverrideRequest> userOverrides
) {
    public AdministrationAccessMatrixUpdateCommand toDomain() {
        return new AdministrationAccessMatrixUpdateCommand(
                rows == null ? List.of() : rows.stream().map(RowRequest::toDomain).toList(),
                userOverrides == null ? List.of() : userOverrides.stream().map(UserOverrideRequest::toDomain).toList()
        );
    }

    public record RowRequest(
            String moduleCode,
            String moduleName,
            Map<String, String> permissions
    ) {
        public AdministrationAccessMatrixRow toDomain() {
            return new AdministrationAccessMatrixRow(moduleCode, moduleName, permissions == null ? Map.of() : permissions);
        }
    }

    public record UserOverrideRequest(
            Long userId,
            String moduleCode,
            String accessLevel
    ) {
        public AdministrationUserModuleOverride toDomain() {
            return new AdministrationUserModuleOverride(userId, moduleCode, accessLevel);
        }
    }
}
