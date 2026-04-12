package com.example.authhexagonal.domain.model;

public record AttendanceAlert(
        String level,
        String studentName,
        String message
) {
}
