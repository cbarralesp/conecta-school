package com.example.authhexagonal.domain.model;

import java.util.List;

public record StudentDashboard(
        Long studentId,
        String studentName,
        String studentRun,
        int enrolledCoursesCount,
        int attendancePercentage,
        int latestGradesCount,
        int upcomingActivitiesCount,
        List<StudentEnrolledCourse> enrolledCourses,
        List<StudentScheduleItem> weeklySchedule,
        List<StudentLatestGrade> latestGrades,
        List<StudentSubjectGradeSummary> gradeSummary,
        StudentAttendanceSummary attendanceSummary,
        List<StudentUpcomingActivity> upcomingActivities
) {
}
