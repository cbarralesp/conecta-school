package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentAttendanceSummary;

public record StudentAttendanceSummaryResponse(
        int percentage,
        int presentCount,
        int lateCount,
        int absentCount,
        int totalRecords
) {

    public static StudentAttendanceSummaryResponse fromDomain(StudentAttendanceSummary summary) {
        return new StudentAttendanceSummaryResponse(
                summary.percentage(),
                summary.presentCount(),
                summary.lateCount(),
                summary.absentCount(),
                summary.totalRecords()
        );
    }
}
