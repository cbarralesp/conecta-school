package com.example.authhexagonal.domain.model;

import java.util.List;

public record GradeBookStudentRow(
        Long studentId,
        String run,
        String fullName,
        List<GradeScoreCell> scores,
        Double average,
        String status,
        String conceptSummaryCode
) {
}
