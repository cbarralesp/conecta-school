package com.example.authhexagonal.domain.model;

public record AdministrationModuleAccessItem(
        String moduleCode,
        String moduleName,
        String accessLevel
) {
}
