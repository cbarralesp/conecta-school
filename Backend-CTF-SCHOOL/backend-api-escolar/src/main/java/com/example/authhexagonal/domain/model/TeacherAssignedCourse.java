package com.example.authhexagonal.domain.model;

public record TeacherAssignedCourse(
        Long id,
        String courseName,
        String courseCode,
        String subjectName,
        String colorHex,
        int weeklyHours,
        boolean homeroomTeacher
) {
}
