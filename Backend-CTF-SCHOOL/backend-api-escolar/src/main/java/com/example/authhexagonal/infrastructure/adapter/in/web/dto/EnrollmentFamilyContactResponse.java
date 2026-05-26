package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentFamilyContact;

public record EnrollmentFamilyContactResponse(
        Long id,
        String run,
        String name,
        String lastName,
        String birthDate,
        String address,
        String phone,
        String email,
        String education
) {
    public static EnrollmentFamilyContactResponse fromDomain(EnrollmentFamilyContact contact) {
        return new EnrollmentFamilyContactResponse(
                contact.id(),
                contact.run(),
                contact.name(),
                contact.lastName(),
                contact.birthDate(),
                contact.address(),
                contact.phone(),
                contact.email(),
                contact.education()
        );
    }
}
