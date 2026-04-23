package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentOverview;

import java.util.List;

public record EnrollmentOverviewResponse(
        EnrollmentSummaryResponse summary,
        List<EnrollmentCourseOptionResponse> courses,
        List<EnrollmentListItemResponse> enrollments,
        EnrollmentPaginationResponse pagination
) {
    public static EnrollmentOverviewResponse fromDomain(EnrollmentOverview overview) {
        return new EnrollmentOverviewResponse(
                EnrollmentSummaryResponse.fromDomain(overview.summary()),
                overview.courses().stream().map(EnrollmentCourseOptionResponse::fromDomain).toList(),
                overview.enrollments().stream().map(EnrollmentListItemResponse::fromDomain).toList(),
                EnrollmentPaginationResponse.fromDomain(overview.pagination())
        );
    }
}
