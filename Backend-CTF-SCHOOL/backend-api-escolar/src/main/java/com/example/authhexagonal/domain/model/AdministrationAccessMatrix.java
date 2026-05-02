package com.example.authhexagonal.domain.model;

import java.util.List;

public record AdministrationAccessMatrix(
        List<AdministrationRoleOption> roles,
        List<AdministrationAccessMatrixRow> rows,
        List<AdministrationUserModuleOverride> userOverrides
) {
}
