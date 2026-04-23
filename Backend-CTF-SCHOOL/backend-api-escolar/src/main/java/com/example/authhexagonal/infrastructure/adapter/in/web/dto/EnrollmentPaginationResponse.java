package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.EnrollmentPagination;

public record EnrollmentPaginationResponse(
        int page,
        int size,
        int totalItems,
        int totalPages
) {
    public static EnrollmentPaginationResponse fromDomain(EnrollmentPagination pagination) {
        return new EnrollmentPaginationResponse(
                pagination.page(),
                pagination.size(),
                pagination.totalItems(),
                pagination.totalPages()
        );
    }
}
