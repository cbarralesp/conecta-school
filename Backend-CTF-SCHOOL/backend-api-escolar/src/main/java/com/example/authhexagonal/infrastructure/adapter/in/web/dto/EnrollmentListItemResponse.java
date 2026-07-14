package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentListItem;

public record EnrollmentListItemResponse(
        Long id,
        Long studentId,
        String studentRun,
        String studentName,
        String studentLastName,
        String fullName,
        Long courseId,
        String courseName,
        int courseSchoolYear,
        String guardianFullName,
        String status,
        String enrollmentDate
) {
    public static EnrollmentListItemResponse fromDomain(EnrollmentListItem item) {
        return new EnrollmentListItemResponse(
                item.id(),
                item.studentId(),
                item.studentRun(),
                item.studentName(),
                item.studentLastName(),
                item.fullName(),
                item.courseId(),
                item.courseName(),
                item.courseSchoolYear(),
                item.guardianFullName(),
                item.status(),
                item.enrollmentDate()
        );
    }
}
