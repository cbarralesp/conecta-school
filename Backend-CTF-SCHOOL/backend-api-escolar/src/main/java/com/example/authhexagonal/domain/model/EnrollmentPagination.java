package com.example.authhexagonal.domain.model;

public record EnrollmentPagination(
        int page,
        int size,
        int totalItems,
        int totalPages
) {
}
