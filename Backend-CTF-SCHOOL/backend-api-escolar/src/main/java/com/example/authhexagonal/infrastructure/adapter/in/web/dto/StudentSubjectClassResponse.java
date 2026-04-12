package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentSubjectClass;

import java.util.List;

public record StudentSubjectClassResponse(
        Long classId,
        String classTitle,
        String classDate,
        boolean hasNewDocuments,
        List<StudentSubjectDocumentResponse> documents
) {

    public static StudentSubjectClassResponse fromDomain(StudentSubjectClass subjectClass) {
        return new StudentSubjectClassResponse(
                subjectClass.classId(),
                subjectClass.classTitle(),
                subjectClass.classDate(),
                subjectClass.hasNewDocuments(),
                subjectClass.documents().stream().map(StudentSubjectDocumentResponse::fromDomain).toList()
        );
    }
}
