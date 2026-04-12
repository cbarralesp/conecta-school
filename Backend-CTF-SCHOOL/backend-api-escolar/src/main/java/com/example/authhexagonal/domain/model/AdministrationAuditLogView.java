package com.example.authhexagonal.domain.model;

import java.util.List;

public record AdministrationAuditLogView(
        List<AdministrationOptionItem> actionOptions,
        List<AdministrationOptionItem> userOptions,
        List<AdministrationAuditLogItem> items
) {
}
