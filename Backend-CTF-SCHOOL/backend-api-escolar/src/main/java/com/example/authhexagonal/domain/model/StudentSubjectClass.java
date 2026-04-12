package com.example.authhexagonal.domain.model;

import java.util.List;

public record StudentSubjectClass(
        Long classId,
        String classTitle,
        String classDate,
        boolean hasNewDocuments,
        List<StudentSubjectDocument> documents
) {
}
