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
        String address,
        String specialNeeds,
        String status,
        String enrollmentDate,
        EnrollmentGuardian guardian,
        List<EnrollmentPickupContact> pickupContacts
) {
}
