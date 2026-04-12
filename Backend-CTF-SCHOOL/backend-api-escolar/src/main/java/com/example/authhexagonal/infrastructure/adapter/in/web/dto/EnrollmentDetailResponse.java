package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentDetail;

import java.util.List;

public record EnrollmentDetailResponse(
        Long id,
        Long studentId,
        String studentRun,
        String studentName,
        String studentLastName,
        String birthDate,
        String gender,
        Long courseId,
        String courseName,
        String address,
        String specialNeeds,
        String status,
        String enrollmentDate,
        EnrollmentGuardianResponse guardian,
        List<EnrollmentPickupContactResponse> pickupContacts
) {
    public static EnrollmentDetailResponse fromDomain(EnrollmentDetail detail) {
        return new EnrollmentDetailResponse(
                detail.id(),
                detail.studentId(),
                detail.studentRun(),
                detail.studentName(),
                detail.studentLastName(),
                detail.birthDate(),
                detail.gender(),
                detail.courseId(),
                detail.courseName(),
                detail.address(),
                detail.specialNeeds(),
                detail.status(),
                detail.enrollmentDate(),
                EnrollmentGuardianResponse.fromDomain(detail.guardian()),
                detail.pickupContacts().stream().map(EnrollmentPickupContactResponse::fromDomain).toList()
        );
    }
}
