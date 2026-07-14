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
        String studentPhotoPath,
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
        EnrollmentEstablishment establishment,
        EnrollmentGuardian guardian,
        EnrollmentFamilyContact father,
        EnrollmentFamilyContact mother,
        List<EnrollmentPickupContact> pickupContacts,
        List<EnrollmentDocument> documents,
        EnrollmentStudentAccess studentAccess,
        EnrollmentGuardianAccess guardianAccess
) {
}
