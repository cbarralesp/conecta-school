package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentPickupContact;

public record EnrollmentPickupContactResponse(
        Long id,
        String run,
        String name,
        String lastName,
        String phone,
        String relation,
        boolean authorizedPickup
) {
    public static EnrollmentPickupContactResponse fromDomain(EnrollmentPickupContact contact) {
        return new EnrollmentPickupContactResponse(
                contact.id(),
                contact.run(),
                contact.name(),
                contact.lastName(),
                contact.phone(),
                contact.relation(),
                contact.authorizedPickup()
        );
    }
}
