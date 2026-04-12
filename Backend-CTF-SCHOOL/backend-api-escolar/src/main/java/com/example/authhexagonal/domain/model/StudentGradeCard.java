package com.example.authhexagonal.domain.model;

import java.util.List;

public record StudentGradeCard(
        Long studentId,
        String run,
        String fullName,
        Double overallAverage,
        String status,
        List<StudentSubjectAverage> subjects
) {
}
