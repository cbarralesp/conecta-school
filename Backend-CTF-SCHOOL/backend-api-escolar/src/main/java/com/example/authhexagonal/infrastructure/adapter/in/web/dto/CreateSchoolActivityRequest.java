package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record CreateSchoolActivityRequest(
        @NotNull Long activityTypeId,
        Long courseId,
        @NotBlank String title,
        String description,
        @NotNull LocalDate date,
        LocalDate endDate,
        LocalTime time,
        String location
) {
}
