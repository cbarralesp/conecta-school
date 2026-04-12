package com.example.authhexagonal.domain.model;

import java.util.List;

public record AdministrationRoleCard(
        String code,
        String name,
        String description,
        long userCount,
        String levelLabel,
        String scopeSummary,
        List<AdministrationPermissionBullet> permissions
) {
}
