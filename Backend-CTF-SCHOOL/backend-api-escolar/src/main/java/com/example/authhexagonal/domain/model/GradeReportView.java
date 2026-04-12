package com.example.authhexagonal.domain.model;

import java.util.List;

public record GradeReportView(
        Long courseId,
        String courseName,
        Long periodId,
        String periodName,
        List<StudentGradeCard> students
) {
}
