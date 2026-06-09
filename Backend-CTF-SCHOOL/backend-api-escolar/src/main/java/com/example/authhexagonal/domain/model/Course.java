package com.example.authhexagonal.domain.model;

public record Course(
        Long id,
        String code,
        String name,
        String level,
        String letter,
        Long gradeId,
        int schoolYear,
        String scheduleType,
        Long teacherId,
        String teacherName,
        Long assistantId,
        String assistantName,
        boolean active,
        int studentCount
) {
}
