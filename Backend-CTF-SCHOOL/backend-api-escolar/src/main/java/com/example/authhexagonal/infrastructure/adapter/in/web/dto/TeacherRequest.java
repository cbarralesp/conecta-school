package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherCommand;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record TeacherRequest(
        @Size(max = 30) String staffType,
        @NotBlank @Size(max = 120) String firstNames,
        @NotBlank @Size(max = 80) String paternalLastName,
        @Size(max = 80) String maternalLastName,
        @NotBlank @Size(max = 20) String run,
        @NotNull LocalDate birthDate,
        @NotBlank @Size(max = 30) String gender,
        @NotBlank @Size(max = 30) String phone,
        @NotBlank @Email @Size(max = 160) String institutionalEmail,
        Long regionId,
        Long communeId,
        @NotBlank @Size(max = 255) String address,
        @NotBlank @Size(max = 180) String professionalTitle,
        @NotBlank @Size(max = 60) String contractType,
        @NotNull Integer weeklyHours,
        @NotNull LocalDate startDate,
        @NotBlank @Size(max = 40) String employmentStatus,
        @NotEmpty List<Long> subjectIds,
        @NotNull List<Long> courseIds,
        @NotBlank @Size(max = 160) String emergencyContactName,
        @NotBlank @Size(max = 80) String emergencyContactRelation,
        @NotBlank @Size(max = 30) String emergencyContactPhone,
        TeacherSystemAccessRequest systemAccess
) {
    public TeacherCommand toDomain() {
        return new TeacherCommand(
                staffType == null || staffType.isBlank() ? "DOCENTE" : staffType.trim().toUpperCase(),
                firstNames,
                paternalLastName,
                maternalLastName,
                run,
                birthDate,
                gender,
                phone,
                institutionalEmail,
                regionId,
                communeId,
                address,
                professionalTitle,
                contractType,
                weeklyHours,
                startDate,
                employmentStatus,
                subjectIds,
                courseIds,
                emergencyContactName,
                emergencyContactRelation,
                emergencyContactPhone,
                systemAccess == null
                        ? new TeacherSystemAccessRequest(false, false, "", "", false, "", "Sin cuenta").toDomain()
                        : systemAccess.toDomain()
        );
    }
}
