package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.Course;

public record CourseResponse(
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
    public static CourseResponse fromDomain(Course course) {
        return new CourseResponse(
                course.id(),
                course.code(),
                course.name(),
                course.level(),
                course.letter(),
                course.gradeId(),
                course.schoolYear(),
                course.scheduleType(),
                course.teacherId(),
                course.teacherName(),
                course.assistantId(),
                course.assistantName(),
                course.active(),
                course.studentCount()
        );
    }
}
