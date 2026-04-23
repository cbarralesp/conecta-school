package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.SchedulePeriodOption;

public record SchedulePeriodOptionResponse(
        Long id,
        String name,
        int schoolYear,
        int semester
) {
    public static SchedulePeriodOptionResponse fromDomain(SchedulePeriodOption period) {
        return new SchedulePeriodOptionResponse(
                period.id(),
                period.name(),
                period.schoolYear(),
                period.semester()
        );
    }
}
