package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentDashboard;

import java.util.List;

public record StudentDashboardResponse(
        Long studentId,
        String studentName,
        String studentRun,
        int enrolledCoursesCount,
        int attendancePercentage,
        int latestGradesCount,
        int upcomingActivitiesCount,
        List<StudentEnrolledCourseResponse> enrolledCourses,
        List<StudentScheduleItemResponse> weeklySchedule,
        List<StudentLatestGradeResponse> latestGrades,
        List<StudentSubjectGradeSummaryResponse> gradeSummary,
        StudentAttendanceSummaryResponse attendanceSummary,
        List<StudentUpcomingActivityResponse> upcomingActivities
) {

    public static StudentDashboardResponse fromDomain(StudentDashboard dashboard) {
        return new StudentDashboardResponse(
                dashboard.studentId(),
                dashboard.studentName(),
                dashboard.studentRun(),
                dashboard.enrolledCoursesCount(),
                dashboard.attendancePercentage(),
                dashboard.latestGradesCount(),
                dashboard.upcomingActivitiesCount(),
                dashboard.enrolledCourses().stream().map(StudentEnrolledCourseResponse::fromDomain).toList(),
                dashboard.weeklySchedule().stream().map(StudentScheduleItemResponse::fromDomain).toList(),
                dashboard.latestGrades().stream().map(StudentLatestGradeResponse::fromDomain).toList(),
                dashboard.gradeSummary().stream().map(StudentSubjectGradeSummaryResponse::fromDomain).toList(),
                StudentAttendanceSummaryResponse.fromDomain(dashboard.attendanceSummary()),
                dashboard.upcomingActivities().stream().map(StudentUpcomingActivityResponse::fromDomain).toList()
        );
    }
}
