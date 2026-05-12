package com.example.authhexagonal.domain.model;

import java.util.List;

public record AdministrationCurrentModuleAccess(
        String roleCode,
        List<AdministrationModuleAccessItem> modules
) {
}
