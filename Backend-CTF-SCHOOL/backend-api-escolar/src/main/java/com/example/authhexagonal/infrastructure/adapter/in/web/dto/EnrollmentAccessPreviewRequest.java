package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

public record EnrollmentAccessPreviewRequest(
        String studentRun,
        String studentName,
        String studentLastName,
        String guardianRun,
        String guardianName,
        String guardianLastName
) {
}
