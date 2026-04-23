package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherAssignedCourse;
import com.example.authhexagonal.domain.model.TeacherDashboard;
import com.example.authhexagonal.domain.model.TeacherPlanningItem;
import com.example.authhexagonal.domain.model.TeacherScheduleItem;

import java.util.List;

public record TeacherDashboardResponse(
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
    public static TeacherDashboardResponse fromDomain(TeacherDashboard dashboard) {
        return new TeacherDashboardResponse(
                dashboard.teacherCode(),
                dashboard.teacherName(),
                dashboard.specialty(),
                dashboard.assignedCoursesCount(),
                dashboard.plannedClassesCount(),
                dashboard.pendingPlanningCount(),
                dashboard.assignedCourses(),
                dashboard.weeklySchedule(),
                dashboard.todaySchedulePreview(),
                dashboard.planningItems()
        );
    }
}
