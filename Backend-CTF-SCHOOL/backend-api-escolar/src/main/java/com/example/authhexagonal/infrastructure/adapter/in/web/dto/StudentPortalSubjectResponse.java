package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentPortalSubject;

public record StudentPortalSubjectResponse(
        Long subjectId,
        String subjectName,
        String courseName,
        int weeklyBlocks,
        String teacherName,
        int totalDocuments,
        int newDocuments
) {

    public static StudentPortalSubjectResponse fromDomain(StudentPortalSubject subject) {
        return new StudentPortalSubjectResponse(
                subject.subjectId(),
                subject.subjectName(),
                subject.courseName(),
                subject.weeklyBlocks(),
                subject.teacherName(),
                subject.totalDocuments(),
                subject.newDocuments()
        );
    }
}
