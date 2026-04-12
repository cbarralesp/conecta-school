package com.example.authhexagonal.domain.model;

public record EnrollmentSummary(
        int total,
        int active,
        int pending,
        int courses
) {
}
