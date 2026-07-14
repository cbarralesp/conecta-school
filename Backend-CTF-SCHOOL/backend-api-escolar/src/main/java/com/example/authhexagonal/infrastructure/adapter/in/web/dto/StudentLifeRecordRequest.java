package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record StudentLifeRecordRequest(
        @NotNull Long studentId,
        Long enrollmentId,
        @NotNull LocalDate date,
        LocalTime time,
        @NotBlank String type,
        @NotBlank String category,
        String area,
        String responsible,
        String status,
        String deadline,
        String description
) {
}
