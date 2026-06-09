package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.CourseGrade;

public record CourseGradeResponse(
        Long id,
        String levelName,
        String name,
        String codeToken,
        int sortOrder,
        boolean active
) {
    public static CourseGradeResponse fromDomain(CourseGrade grade) {
        return new CourseGradeResponse(
                grade.id(),
                grade.levelName(),
                grade.name(),
                grade.codeToken(),
                grade.sortOrder(),
                grade.active()
        );
    }
}
