package com.example.authhexagonal.domain.model;

public record AttendanceStudentSummary(
        Long studentId,
        int percentage,
        int presentCount,
        int absentCount,
        int lateCount,
        int totalRecords
) {
}
