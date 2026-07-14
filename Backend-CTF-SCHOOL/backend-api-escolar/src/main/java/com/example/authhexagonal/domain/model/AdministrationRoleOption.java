package com.example.authhexagonal.domain.model;

public record AdministrationRoleOption(
        String code,
        String name,
        String description,
        int userCount
) {
}
