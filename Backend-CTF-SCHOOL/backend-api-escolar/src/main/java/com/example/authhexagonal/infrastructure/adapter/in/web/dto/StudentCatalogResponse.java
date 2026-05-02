package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentCatalogItem;

import java.time.LocalDate;

public record StudentCatalogResponse(
        Long id,
        String run,
        String firstName,
        String lastName,
        String fullName,
        String address,
        Long regionId,
        Long communeId,
        String regionName,
        String communeName,
        LocalDate birthDate,
        int age
) {
    public static StudentCatalogResponse fromDomain(StudentCatalogItem item) {
        return new StudentCatalogResponse(
                item.id(),
                item.run(),
                item.firstName(),
                item.lastName(),
                item.fullName(),
                item.address(),
                item.regionId(),
                item.communeId(),
                item.regionName(),
                item.communeName(),
                item.birthDate(),
                item.age()
        );
    }
}
