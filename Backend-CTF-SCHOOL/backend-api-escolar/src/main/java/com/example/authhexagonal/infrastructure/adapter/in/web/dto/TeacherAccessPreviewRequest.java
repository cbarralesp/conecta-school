package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

public record TeacherAccessPreviewRequest(
        String run,
        String firstNames,
        String paternalLastName,
        String maternalLastName,
        String staffType
) {
}
