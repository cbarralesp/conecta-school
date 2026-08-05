package com.example.authhexagonal.domain.model;

import java.util.List;

public record AdministrationAuditLogView(
        List<AdministrationOptionItem> actionOptions,
        List<AdministrationOptionItem> userOptions,
        List<AdministrationOptionItem> roleOptions,
        List<AdministrationAuditLogItem> items
) {
}
