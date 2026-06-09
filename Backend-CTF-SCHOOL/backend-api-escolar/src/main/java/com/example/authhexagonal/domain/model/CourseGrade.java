package com.example.authhexagonal.domain.model;

public record CourseGrade(
        Long id,
        String levelName,
        String name,
        String codeToken,
        int sortOrder,
        boolean active
) {
}
