package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.ScheduleCatalog;

import java.util.List;

public record ScheduleCatalogResponse(
        List<ScheduleCourseOptionResponse> courses,
        List<SchedulePeriodOptionResponse> periods,
        List<ScheduleTeacherOptionResponse> teachers,
        List<SubjectResponse> subjects,
        List<ScheduleBlockResponse> blocks
) {
    public static ScheduleCatalogResponse fromDomain(ScheduleCatalog catalog) {
        return new ScheduleCatalogResponse(
                catalog.courses().stream().map(ScheduleCourseOptionResponse::fromDomain).toList(),
                catalog.periods().stream().map(SchedulePeriodOptionResponse::fromDomain).toList(),
                catalog.teachers().stream().map(ScheduleTeacherOptionResponse::fromDomain).toList(),
                catalog.subjects().stream().map(SubjectResponse::fromDomain).toList(),
                catalog.blocks().stream().map(ScheduleBlockResponse::fromDomain).toList()
        );
    }
}
