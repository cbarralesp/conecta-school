package com.example.authhexagonal.domain.model;

import java.util.List;

public record StudentGradeProfileView(
        Long courseId,
        String courseName,
        Long periodId,
        String periodName,
        List<StudentGradeCard> students
) {
}
