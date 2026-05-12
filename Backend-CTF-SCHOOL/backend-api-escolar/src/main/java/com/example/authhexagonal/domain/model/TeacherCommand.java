package com.example.authhexagonal.domain.model;

import java.time.LocalDate;
import java.util.List;

public record TeacherCommand(
        String staffType,
        String firstNames,
        String paternalLastName,
        String maternalLastName,
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
        List<Long> subjectIds,
        List<Long> courseIds,
        String emergencyContactName,
        String emergencyContactRelation,
        String emergencyContactPhone,
        TeacherSystemAccess systemAccess
) {
}
