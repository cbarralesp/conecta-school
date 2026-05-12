package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherCatalogItem;

import java.util.List;

public record TeacherCatalogResponse(
        Long id,
        String staffType,
        String firstName,
        String lastName,
        String fullName,
        String rud,
        String address,
        Long regionId,
        Long communeId,
        String regionName,
        String communeName,
        String email,
        List<String> subjects
) {
    public static TeacherCatalogResponse fromDomain(TeacherCatalogItem item) {
        return new TeacherCatalogResponse(
                item.id(),
                item.staffType(),
                item.firstName(),
                item.lastName(),
                item.fullName(),
                item.rud(),
                item.address(),
                item.regionId(),
                item.communeId(),
                item.regionName(),
                item.communeName(),
                item.email(),
                item.subjects()
        );
    }
}
