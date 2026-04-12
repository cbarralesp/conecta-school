package com.example.authhexagonal.domain.model;

import java.util.Map;

public record AdministrationAccessMatrixRow(
        String moduleName,
        Map<String, String> permissions
) {
}
