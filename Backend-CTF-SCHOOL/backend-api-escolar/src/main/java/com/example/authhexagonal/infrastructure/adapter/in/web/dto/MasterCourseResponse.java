package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.MasterCourse;

public record MasterCourseResponse(
        Long id,
        String code,
        String description,
        String level,
        String codeToken,
        int sortOrder
) {
    public static MasterCourseResponse fromDomain(MasterCourse masterCourse) {
        return new MasterCourseResponse(
                masterCourse.id(),
                masterCourse.code(),
                masterCourse.description(),
                masterCourse.level(),
                masterCourse.codeToken(),
                masterCourse.sortOrder()
        );
    }
}
