package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.SubjectAssignedTeacher;

public record SubjectAssignedTeacherResponse(
        Long id,
        String code,
        String fullName
) {
    public static SubjectAssignedTeacherResponse fromDomain(SubjectAssignedTeacher teacher) {
        return new SubjectAssignedTeacherResponse(
                teacher.id(),
                teacher.code(),
                teacher.fullName()
        );
    }
}
