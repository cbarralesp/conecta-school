package com.example.authhexagonal.domain.model;

import java.util.List;

public record TeacherCatalogItem(
        Long id,
        String firstName,
        String rud,
        String lastName,
        String address,
        String email,
        List<String> subjects
) {
    public String fullName() {
        return firstName + " " + lastName;
    }
}
