package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherCatalogItem;

import java.util.List;

public record TeacherCatalogResponse(
        Long id,
        String firstName,
        String lastName,
        String fullName,
        String rud,
        String address,
        String email,
        List<String> subjects
) {
    public static TeacherCatalogResponse fromDomain(TeacherCatalogItem item) {
        return new TeacherCatalogResponse(
                item.id(),
                item.firstName(),
                item.lastName(),
                item.fullName(),
                item.rud(),
                item.address(),
                item.email(),
                item.subjects()
        );
    }
}
