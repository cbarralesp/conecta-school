package com.example.authhexagonal.domain.model;

public record StudentEnrolledCourse(
        Long id,
        String courseName,
        String courseCode,
        String status
) {
}
