package com.example.authhexagonal.domain.model;

public record AdministrationAuditLogItem(
        Long id,
        String occurredAt,
        String occurredLabel,
        String type,
        String userDisplay,
        String actionLabel,
        String context
) {
}
