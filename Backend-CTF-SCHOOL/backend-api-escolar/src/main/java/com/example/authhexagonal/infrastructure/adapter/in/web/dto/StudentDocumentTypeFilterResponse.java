package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentDocumentTypeFilter;

public record StudentDocumentTypeFilterResponse(
        String code,
        String label,
        int count
) {

    public static StudentDocumentTypeFilterResponse fromDomain(StudentDocumentTypeFilter filter) {
        return new StudentDocumentTypeFilterResponse(filter.code(), filter.label(), filter.count());
    }
}
