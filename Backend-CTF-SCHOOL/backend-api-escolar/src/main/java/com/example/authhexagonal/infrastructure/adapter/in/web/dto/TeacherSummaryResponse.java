package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherSummary;

public record TeacherSummaryResponse(
        int totalTeachers,
        int activeTeachers,
        int subjectCount,
        int fullTimeTeachers
) {
    public static TeacherSummaryResponse fromDomain(TeacherSummary summary) {
        return new TeacherSummaryResponse(
                summary.totalTeachers(),
                summary.activeTeachers(),
                summary.subjectCount(),
                summary.fullTimeTeachers()
        );
    }
}
