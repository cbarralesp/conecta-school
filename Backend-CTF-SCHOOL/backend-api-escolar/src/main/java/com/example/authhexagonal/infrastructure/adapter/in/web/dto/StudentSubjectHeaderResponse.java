package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentSubjectHeader;

public record StudentSubjectHeaderResponse(
        Long subjectId,
        String subjectName,
        String courseName,
        String semesterLabel,
        String teacherName,
        int weeklyBlocks
) {

    public static StudentSubjectHeaderResponse fromDomain(StudentSubjectHeader header) {
        return new StudentSubjectHeaderResponse(
                header.subjectId(),
                header.subjectName(),
                header.courseName(),
                header.semesterLabel(),
                header.teacherName(),
                header.weeklyBlocks()
        );
    }
}
