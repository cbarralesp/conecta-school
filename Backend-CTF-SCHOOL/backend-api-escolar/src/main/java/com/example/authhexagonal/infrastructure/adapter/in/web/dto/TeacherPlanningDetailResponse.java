package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherPlanningDetail;

import java.time.LocalDate;

public record TeacherPlanningDetailResponse(
        Long id,
        String title,
        String unit,
        String learningObjective,
        String status,
        LocalDate classDate,
        String courseName,
        String subjectName,
        String teacherName,
        String resources,
        String activities,
        String evaluation,
        String observations
) {
    public static TeacherPlanningDetailResponse fromDomain(TeacherPlanningDetail detail) {
        return new TeacherPlanningDetailResponse(
                detail.id(),
                detail.title(),
                detail.unit(),
                detail.learningObjective(),
                detail.status(),
                detail.classDate(),
                detail.courseName(),
                detail.subjectName(),
                detail.teacherName(),
                detail.resources(),
                detail.activities(),
                detail.evaluation(),
                detail.observations()
        );
    }
}
