package com.example.authhexagonal.domain.model;

import java.time.LocalDate;

public record TeacherPlanningDetail(
        Long id,
        String title,
        String unit,
        String learningObjective,
        String status,
        LocalDate classDate,
        String courseName,
        String subjectName,
        String teacherName,
        String resources,
        String activities,
        String evaluation,
        String observations
) {
}
