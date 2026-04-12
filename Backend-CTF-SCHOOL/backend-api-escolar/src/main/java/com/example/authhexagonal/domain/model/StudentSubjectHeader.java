package com.example.authhexagonal.domain.model;

public record StudentSubjectHeader(
        Long subjectId,
        String subjectName,
        String courseName,
        String semesterLabel,
        String teacherName,
        int weeklyBlocks
) {
}
