package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.ScheduleTeacherOption;

public record ScheduleTeacherOptionResponse(
        Long id,
        String code,
        String fullName,
        String specialty
) {
    public static ScheduleTeacherOptionResponse fromDomain(ScheduleTeacherOption teacher) {
        return new ScheduleTeacherOptionResponse(
                teacher.id(),
                teacher.code(),
                teacher.fullName(),
                teacher.specialty()
        );
    }
}
