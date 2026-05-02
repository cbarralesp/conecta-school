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
        Long regionId,
        Long communeId,
        String address,
        String specialNeeds,
        String status,
        String enrollmentDate,
        EnrollmentEstablishmentResponse establishment,
        EnrollmentGuardianResponse guardian,
        List<EnrollmentPickupContactResponse> pickupContacts,
        List<EnrollmentDocumentResponse> documents
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
                detail.regionId(),
                detail.communeId(),
                detail.address(),
                detail.specialNeeds(),
                detail.status(),
                detail.enrollmentDate(),
                EnrollmentEstablishmentResponse.fromDomain(detail.establishment()),
                EnrollmentGuardianResponse.fromDomain(detail.guardian()),
                detail.pickupContacts().stream().map(EnrollmentPickupContactResponse::fromDomain).toList(),
                detail.documents().stream().map(EnrollmentDocumentResponse::fromDomain).toList()
        );
    }
}
