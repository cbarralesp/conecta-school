package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentAttendanceDetail;
import com.example.authhexagonal.domain.model.StudentAttendanceHeader;
import com.example.authhexagonal.domain.model.StudentAttendanceHistoryDay;
import com.example.authhexagonal.domain.model.StudentAttendanceMonthSummary;
import com.example.authhexagonal.domain.model.StudentAttendanceRecord;
import com.example.authhexagonal.domain.model.StudentAttendanceSummary;
import com.example.authhexagonal.domain.model.StudentAttendanceWeekDay;

import java.util.List;

public record StudentAttendanceResponse(
        StudentAttendanceHeaderResponse header,
        StudentAttendanceSummaryResponse summary,
        StudentAttendanceMonthResponse currentMonth,
        List<StudentAttendanceWeekDayResponse> currentWeek,
        List<StudentAttendanceRecordResponse> recentRecords,
        List<StudentAttendanceHistoryDayResponse> historyDays
) {

    public static StudentAttendanceResponse fromDomain(StudentAttendanceDetail detail) {
        return new StudentAttendanceResponse(
                StudentAttendanceHeaderResponse.fromDomain(detail.header()),
                StudentAttendanceSummaryResponse.fromDomain(detail.summary()),
                StudentAttendanceMonthResponse.fromDomain(detail.currentMonth()),
                detail.currentWeek().stream().map(StudentAttendanceWeekDayResponse::fromDomain).toList(),
                detail.recentRecords().stream().map(StudentAttendanceRecordResponse::fromDomain).toList(),
                detail.historyDays().stream().map(StudentAttendanceHistoryDayResponse::fromDomain).toList()
        );
    }

    public record StudentAttendanceHeaderResponse(
            Long studentId,
            String studentName,
            String courseName,
            String periodLabel
    ) {
        private static StudentAttendanceHeaderResponse fromDomain(StudentAttendanceHeader header) {
            return new StudentAttendanceHeaderResponse(
                    header.studentId(),
                    header.studentName(),
                    header.courseName(),
                    header.periodLabel()
            );
        }
    }

    public record StudentAttendanceSummaryResponse(
            int percentage,
            int presentCount,
            int lateCount,
            int absentCount,
            int totalRecords
    ) {
        private static StudentAttendanceSummaryResponse fromDomain(StudentAttendanceSummary summary) {
            return new StudentAttendanceSummaryResponse(
                    summary.percentage(),
                    summary.presentCount(),
                    summary.lateCount(),
                    summary.absentCount(),
                    summary.totalRecords()
            );
        }
    }

    public record StudentAttendanceMonthResponse(
            String monthLabel,
            int attendancePercentage,
            int presentCount,
            int absentCount,
            int lateCount,
            int recordedDays
    ) {
        private static StudentAttendanceMonthResponse fromDomain(StudentAttendanceMonthSummary month) {
            return new StudentAttendanceMonthResponse(
                    month.monthLabel(),
                    month.attendancePercentage(),
                    month.presentCount(),
                    month.absentCount(),
                    month.lateCount(),
                    month.recordedDays()
            );
        }
    }

    public record StudentAttendanceWeekDayResponse(
            String date,
            String dayLabel,
            String status,
            boolean today
    ) {
        private static StudentAttendanceWeekDayResponse fromDomain(StudentAttendanceWeekDay day) {
            return new StudentAttendanceWeekDayResponse(day.date(), day.dayLabel(), day.status(), day.today());
        }
    }

    public record StudentAttendanceRecordResponse(
            String date,
            String status,
            String timeLabel,
            String note
    ) {
        private static StudentAttendanceRecordResponse fromDomain(StudentAttendanceRecord record) {
            return new StudentAttendanceRecordResponse(
                    record.date(),
                    record.status(),
                    record.timeLabel(),
                    record.note()
            );
        }
    }

    public record StudentAttendanceHistoryDayResponse(
            String date,
            String status
    ) {
        private static StudentAttendanceHistoryDayResponse fromDomain(StudentAttendanceHistoryDay day) {
            return new StudentAttendanceHistoryDayResponse(day.date(), day.status());
        }
    }
}
