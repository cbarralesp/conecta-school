package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentSubjectDocuments;

import java.util.List;

public record StudentSubjectDocumentsResponse(
        StudentSubjectHeaderResponse subject,
        StudentSubjectMetricsResponse metrics,
        List<StudentDocumentTypeFilterResponse> filters,
        List<StudentSubjectUnitResponse> units
) {

    public static StudentSubjectDocumentsResponse fromDomain(StudentSubjectDocuments documents) {
        return new StudentSubjectDocumentsResponse(
                StudentSubjectHeaderResponse.fromDomain(documents.subject()),
                StudentSubjectMetricsResponse.fromDomain(documents.metrics()),
                documents.filters().stream().map(StudentDocumentTypeFilterResponse::fromDomain).toList(),
                documents.units().stream().map(StudentSubjectUnitResponse::fromDomain).toList()
        );
    }
}
