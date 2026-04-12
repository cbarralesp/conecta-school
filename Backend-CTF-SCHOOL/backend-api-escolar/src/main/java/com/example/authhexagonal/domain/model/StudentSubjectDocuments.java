package com.example.authhexagonal.domain.model;

import java.util.List;

public record StudentSubjectDocuments(
        StudentSubjectHeader subject,
        StudentSubjectMetrics metrics,
        List<StudentDocumentTypeFilter> filters,
        List<StudentSubjectUnit> units
) {
}
