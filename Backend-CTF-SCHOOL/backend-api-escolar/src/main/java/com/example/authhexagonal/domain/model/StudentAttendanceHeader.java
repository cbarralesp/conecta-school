package com.example.authhexagonal.domain.model;

public record StudentAttendanceHeader(
        Long studentId,
        String studentName,
        String courseName,
        String periodLabel
) {
}
