package com.example.authhexagonal.domain.model;

import java.util.List;

public record EnrollmentOverview(
        EnrollmentSummary summary,
        List<EnrollmentCourseOption> courses,
        List<EnrollmentListItem> enrollments,
        EnrollmentPagination pagination
) {
}
