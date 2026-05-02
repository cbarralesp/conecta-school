package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentEstablishment;

public record EnrollmentEstablishmentResponse(
        Long regionId,
        Long communeId,
        String name,
        String academicYear,
        String dependency,
        String region,
        String commune,
        String address
) {
    public static EnrollmentEstablishmentResponse fromDomain(EnrollmentEstablishment establishment) {
        return new EnrollmentEstablishmentResponse(
                establishment.regionId(),
                establishment.communeId(),
                establishment.name(),
                establishment.academicYear(),
                establishment.dependency(),
                establishment.region(),
                establishment.commune(),
                establishment.address()
        );
    }
}
