package com.example.authhexagonal.domain.model;

import java.util.List;

public record AdministrationAccessMatrixUpdateCommand(
        List<AdministrationAccessMatrixRow> rows,
        List<AdministrationUserModuleOverride> userOverrides
) {
}
