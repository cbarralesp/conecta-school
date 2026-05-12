package com.example.authhexagonal.domain.model;

import java.util.List;

public record EnrollmentDetail(
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
        EnrollmentEstablishment establishment,
        EnrollmentGuardian guardian,
        List<EnrollmentPickupContact> pickupContacts,
        List<EnrollmentDocument> documents,
        EnrollmentStudentAccess studentAccess,
        EnrollmentGuardianAccess guardianAccess
) {
}
