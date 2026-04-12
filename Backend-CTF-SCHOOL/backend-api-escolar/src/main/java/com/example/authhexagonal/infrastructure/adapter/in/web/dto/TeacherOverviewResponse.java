package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherOverview;

import java.util.List;

public record TeacherOverviewResponse(
        TeacherSummaryResponse summary,
        List<SubjectResponse> subjects,
        List<TeacherListItemResponse> teachers
) {
    public static TeacherOverviewResponse fromDomain(TeacherOverview overview) {
        return new TeacherOverviewResponse(
                TeacherSummaryResponse.fromDomain(overview.summary()),
                overview.subjects().stream().map(SubjectResponse::fromDomain).toList(),
                overview.teachers().stream().map(TeacherListItemResponse::fromDomain).toList()
        );
    }
}
