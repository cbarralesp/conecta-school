package com.example.authhexagonal.domain.model;

public record MasterCourse(
        Long id,
        String code,
        String description,
        String level,
        String codeToken,
        int sortOrder
) {
}
