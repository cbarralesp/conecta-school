package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherAssignedCourse;

public record TeacherAssignedCourseResponse(
        Long id,
        String courseName,
        String courseCode,
        String subjectName,
        String colorHex,
        int weeklyHours,
        boolean homeroomTeacher
) {
    public static TeacherAssignedCourseResponse fromDomain(TeacherAssignedCourse course) {
        return new TeacherAssignedCourseResponse(
                course.id(),
                course.courseName(),
                course.courseCode(),
                course.subjectName(),
                course.colorHex(),
                course.weeklyHours(),
                course.homeroomTeacher()
        );
    }
}
