package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentGuardian;

public record EnrollmentGuardianResponse(
        Long id,
        String run,
        String name,
        String lastName,
        String phone,
        String email,
        String relation,
        boolean authorizedPickup
) {
    public static EnrollmentGuardianResponse fromDomain(EnrollmentGuardian guardian) {
        return new EnrollmentGuardianResponse(
                guardian.id(),
                guardian.run(),
                guardian.name(),
                guardian.lastName(),
                guardian.phone(),
                guardian.email(),
                guardian.relation(),
                guardian.authorizedPickup()
        );
    }
}
