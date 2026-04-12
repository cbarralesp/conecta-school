package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentSummary;

public record EnrollmentSummaryResponse(
        int total,
        int active,
        int pending,
        int courses
) {
    public static EnrollmentSummaryResponse fromDomain(EnrollmentSummary summary) {
        return new EnrollmentSummaryResponse(
                summary.total(),
                summary.active(),
                summary.pending(),
                summary.courses()
        );
    }
}
