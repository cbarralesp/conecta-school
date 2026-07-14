package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record StudentLifeInterviewRequest(
        @NotNull Long studentId,
        Long enrollmentId,
        @NotNull LocalDate date,
        LocalTime time,
        @NotBlank String type,
        List<String> participants,
        @NotBlank String reason,
        String responsible,
        String responsibleRole,
        String status,
        String summary,
        String agreements
) {
}
