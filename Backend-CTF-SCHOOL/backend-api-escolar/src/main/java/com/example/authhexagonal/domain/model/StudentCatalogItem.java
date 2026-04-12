package com.example.authhexagonal.domain.model;

import java.time.LocalDate;

public record StudentCatalogItem(
        Long id,
        String run,
        String firstName,
        String lastName,
        String address,
        LocalDate birthDate,
        int age
) {
    public String fullName() {
        return firstName + " " + lastName;
    }
}
