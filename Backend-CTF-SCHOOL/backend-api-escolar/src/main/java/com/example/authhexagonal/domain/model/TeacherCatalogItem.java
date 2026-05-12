package com.example.authhexagonal.domain.model;

import java.util.List;

public record TeacherCatalogItem(
        Long id,
        String staffType,
        String firstName,
        String rud,
        String lastName,
        String address,
        Long regionId,
        Long communeId,
        String regionName,
        String communeName,
        String email,
        List<String> subjects
) {
    public String fullName() {
        return firstName + " " + lastName;
    }
}
