package com.example.authhexagonal.domain.model;

public record StudentPortalSubject(
        Long subjectId,
        String subjectName,
        String courseName,
        int weeklyBlocks,
        String teacherName,
        int totalDocuments,
        int newDocuments
) {
}
