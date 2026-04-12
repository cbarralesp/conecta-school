package com.example.authhexagonal.domain.model;

public record TeacherSummary(
        int totalTeachers,
        int activeTeachers,
        int subjectCount,
        int fullTimeTeachers
) {
}
