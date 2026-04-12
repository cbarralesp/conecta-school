package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.ActivityType;

public record ActivityTypeResponse(
        Long id,
        String code,
        String name,
        String description,
        String backgroundColor,
        String textColor,
        String icon
) {
    public static ActivityTypeResponse fromDomain(ActivityType activityType) {
        return new ActivityTypeResponse(
                activityType.id(),
                activityType.code(),
                activityType.name(),
                activityType.description(),
                activityType.backgroundColor(),
                activityType.textColor(),
                activityType.icon()
        );
    }
}
