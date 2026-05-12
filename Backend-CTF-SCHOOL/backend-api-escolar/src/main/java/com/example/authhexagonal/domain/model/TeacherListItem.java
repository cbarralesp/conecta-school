package com.example.authhexagonal.domain.model;

import java.util.List;

public record TeacherListItem(
        Long id,
        String teacherCode,
        String staffType,
        String fullName,
        String run,
        String professionalTitle,
        String contractType,
        int weeklyHours,
        String employmentStatus,
        boolean active,
        List<AcademicSubject> subjects,
        List<String> assignedCourses
) {
}
