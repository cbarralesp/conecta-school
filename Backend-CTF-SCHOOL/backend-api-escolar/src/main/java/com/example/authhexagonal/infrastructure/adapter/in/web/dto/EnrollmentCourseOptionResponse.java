package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentCourseOption;

public record EnrollmentCourseOptionResponse(
        Long id,
        String code,
        String name,
        int schoolYear
) {
    public static EnrollmentCourseOptionResponse fromDomain(EnrollmentCourseOption course) {
        return new EnrollmentCourseOptionResponse(
                course.id(),
                course.code(),
                course.name(),
                course.schoolYear()
        );
    }
}
