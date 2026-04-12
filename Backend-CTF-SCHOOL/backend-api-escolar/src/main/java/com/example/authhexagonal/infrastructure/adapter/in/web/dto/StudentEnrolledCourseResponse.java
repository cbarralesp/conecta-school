package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentEnrolledCourse;

public record StudentEnrolledCourseResponse(
        Long id,
        String courseName,
        String courseCode,
        String status
) {

    public static StudentEnrolledCourseResponse fromDomain(StudentEnrolledCourse course) {
        return new StudentEnrolledCourseResponse(
                course.id(),
                course.courseName(),
                course.courseCode(),
                course.status()
        );
    }
}
