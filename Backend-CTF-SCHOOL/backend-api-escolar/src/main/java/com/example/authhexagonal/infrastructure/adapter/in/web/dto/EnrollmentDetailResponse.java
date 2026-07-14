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
        String studentPhotoUrl,
        String studentPhotoMimeType,
        Long courseId,
        String courseName,
        String courseLevel,
        String courseLetter,
        Integer courseSchoolYear,
        String courseScheduleType,
        Long regionId,
        Long communeId,
        String address,
        String livesWith,
        String allergies,
        String specialistDiagnoses,
        String emergencyContact,
        String specialNeeds,
        String status,
        String enrollmentDate,
        EnrollmentEstablishmentResponse establishment,
        EnrollmentGuardianResponse guardian,
        EnrollmentFamilyContactResponse father,
        EnrollmentFamilyContactResponse mother,
        List<EnrollmentPickupContactResponse> pickupContacts,
        List<EnrollmentDocumentResponse> documents,
        EnrollmentStudentAccessResponse studentAccess,
        EnrollmentGuardianAccessResponse guardianAccess
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
                buildStudentPhotoUrl(detail),
                detail.studentPhotoMimeType(),
                detail.courseId(),
                detail.courseName(),
                detail.courseLevel(),
                detail.courseLetter(),
                detail.courseSchoolYear(),
                detail.courseScheduleType(),
                detail.regionId(),
                detail.communeId(),
                detail.address(),
                detail.livesWith(),
                detail.allergies(),
                detail.specialistDiagnoses(),
                detail.emergencyContact(),
                detail.specialNeeds(),
                detail.status(),
                detail.enrollmentDate(),
                EnrollmentEstablishmentResponse.fromDomain(detail.establishment()),
                EnrollmentGuardianResponse.fromDomain(detail.guardian()),
                EnrollmentFamilyContactResponse.fromDomain(detail.father()),
                EnrollmentFamilyContactResponse.fromDomain(detail.mother()),
                detail.pickupContacts().stream().map(EnrollmentPickupContactResponse::fromDomain).toList(),
                detail.documents().stream().map(EnrollmentDocumentResponse::fromDomain).toList(),
                EnrollmentStudentAccessResponse.fromDomain(detail.studentAccess()),
                EnrollmentGuardianAccessResponse.fromDomain(detail.guardianAccess())
        );
    }

    private static String buildStudentPhotoUrl(EnrollmentDetail detail) {
        if (detail.studentPhotoPath() == null || detail.studentPhotoPath().isBlank()) {
            return "";
        }
        return "/matriculas/" + detail.id() + "/foto";
    }
}
