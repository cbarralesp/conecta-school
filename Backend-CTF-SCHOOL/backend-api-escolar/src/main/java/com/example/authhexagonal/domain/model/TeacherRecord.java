package com.example.authhexagonal.domain.model;

import java.time.LocalDate;
import java.util.List;

public record TeacherRecord(
        Long id,
        String teacherCode,
        String staffType,
        String firstNames,
        String paternalLastName,
        String maternalLastName,
        String fullName,
        String run,
        LocalDate birthDate,
        String gender,
        String phone,
        String institutionalEmail,
        Long regionId,
        Long communeId,
        String address,
        String professionalTitle,
        String contractType,
        int weeklyHours,
        LocalDate startDate,
        String employmentStatus,
        boolean active,
        List<AcademicSubject> subjects,
        List<TeacherAssignedCourse> assignedCourses,
        List<TeacherScheduleItem> weeklySchedule,
        TeacherEmergencyContact emergencyContact,
        TeacherSystemAccess systemAccess
) {
}
