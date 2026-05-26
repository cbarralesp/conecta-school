package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record EnrollmentRequest(
        @NotBlank @Size(max = 20) String studentRun,
        @NotBlank @Size(max = 120) String studentName,
        @NotBlank @Size(max = 160) String studentLastName,
        @NotNull LocalDate birthDate,
        @NotBlank @Size(max = 30) String gender,
        @NotNull Long courseId,
        @Valid EnrollmentCourseSelectionRequest courseSelection,
        Long regionId,
        Long communeId,
        @NotBlank @Size(max = 255) String address,
        @Size(max = 120) String livesWith,
        @Size(max = 500) String allergies,
        @Size(max = 1000) String specialistDiagnoses,
        @Size(max = 255) String emergencyContact,
        @Size(max = 255) String specialNeeds,
        @NotBlank @Size(max = 40) String status,
        @NotNull LocalDate enrollmentDate,
        @NotNull @Valid EnrollmentEstablishmentRequest establishment,
        @NotNull @Valid EnrollmentGuardianRequest guardian,
        @Valid EnrollmentFamilyContactRequest father,
        @Valid EnrollmentFamilyContactRequest mother,
        @NotEmpty List<@Valid EnrollmentPickupContactRequest> pickupContacts,
        List<@Valid EnrollmentDocumentRequest> documents,
        @Valid EnrollmentStudentAccessRequest studentAccess,
        @Valid EnrollmentGuardianAccessRequest guardianAccess
) {
}
