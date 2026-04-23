package com.example.authhexagonal.domain.model;

import java.util.List;

public record TeacherDashboard(
        String teacherCode,
        String teacherName,
        String specialty,
        int assignedCoursesCount,
        int plannedClassesCount,
        int pendingPlanningCount,
        List<TeacherAssignedCourse> assignedCourses,
        List<TeacherScheduleItem> weeklySchedule,
        List<TeacherScheduleItem> todaySchedulePreview,
        List<TeacherPlanningItem> planningItems
) {
}
