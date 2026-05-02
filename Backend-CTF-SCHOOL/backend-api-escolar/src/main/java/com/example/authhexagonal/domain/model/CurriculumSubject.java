package com.example.authhexagonal.domain.model;

import java.util.UUID;

public record CurriculumSubject(
        UUID id,
        String slug,
        String nombre,
        int totalGrados
) {
}
