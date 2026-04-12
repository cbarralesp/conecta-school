package com.example.authhexagonal.domain.model;

public record EnrollmentListItem(
        Long id,
        Long studentId,
        String studentRun,
        String studentName,
        String studentLastName,
        String fullName,
        Long courseId,
        String courseName,
        String guardianFullName,
        String status,
        String enrollmentDate
) {
}
