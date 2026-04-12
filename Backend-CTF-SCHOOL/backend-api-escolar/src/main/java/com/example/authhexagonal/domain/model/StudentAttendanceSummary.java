package com.example.authhexagonal.domain.model;

public record StudentAttendanceSummary(
        int percentage,
        int presentCount,
        int lateCount,
        int absentCount,
        int totalRecords
) {
}
