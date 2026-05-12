package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherListItem;

import java.util.List;

public record TeacherListItemResponse(
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
        List<SubjectResponse> subjects,
        List<String> assignedCourses
) {
    public static TeacherListItemResponse fromDomain(TeacherListItem item) {
        return new TeacherListItemResponse(
                item.id(),
                item.teacherCode(),
                item.staffType(),
                item.fullName(),
                item.run(),
                item.professionalTitle(),
                item.contractType(),
                item.weeklyHours(),
                item.employmentStatus(),
                item.active(),
                item.subjects().stream().map(SubjectResponse::fromDomain).toList(),
                item.assignedCourses()
        );
    }
}
