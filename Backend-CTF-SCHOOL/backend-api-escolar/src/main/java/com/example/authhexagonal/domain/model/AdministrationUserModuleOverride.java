package com.example.authhexagonal.domain.model;

public record AdministrationUserModuleOverride(
        Long userId,
        String moduleCode,
        String accessLevel
) {
}
