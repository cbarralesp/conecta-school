package com.example.authhexagonal.domain.model;

import java.util.List;

public record AdministrationUsersOverview(
        List<AdministrationMetric> summary,
        List<AdministrationRoleOption> roles,
        List<AdministrationUserListItem> users
) {
}
