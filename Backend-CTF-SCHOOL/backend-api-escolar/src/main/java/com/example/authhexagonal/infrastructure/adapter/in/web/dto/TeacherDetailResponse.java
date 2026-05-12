package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherRecord;

import java.time.LocalDate;
import java.util.List;

public record TeacherDetailResponse(
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
        List<SubjectResponse> subjects,
        List<TeacherAssignedCourseResponse> assignedCourses,
        List<TeacherScheduleItemResponse> weeklySchedule,
        TeacherEmergencyContactResponse emergencyContact,
        TeacherSystemAccessResponse systemAccess
) {
    public static TeacherDetailResponse fromDomain(TeacherRecord record) {
        return new TeacherDetailResponse(
                record.id(),
                record.teacherCode(),
                record.staffType(),
                record.firstNames(),
                record.paternalLastName(),
                record.maternalLastName(),
                record.fullName(),
                record.run(),
                record.birthDate(),
                record.gender(),
                record.phone(),
                record.institutionalEmail(),
                record.regionId(),
                record.communeId(),
                record.address(),
                record.professionalTitle(),
                record.contractType(),
                record.weeklyHours(),
                record.startDate(),
                record.employmentStatus(),
                record.active(),
                record.subjects().stream().map(SubjectResponse::fromDomain).toList(),
                record.assignedCourses().stream().map(TeacherAssignedCourseResponse::fromDomain).toList(),
                record.weeklySchedule().stream().map(TeacherScheduleItemResponse::fromDomain).toList(),
                TeacherEmergencyContactResponse.fromDomain(record.emergencyContact()),
                TeacherSystemAccessResponse.fromDomain(record.systemAccess())
        );
    }
}
