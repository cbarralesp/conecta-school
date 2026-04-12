package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CourseRequest(
        @NotBlank String code,
        @NotBlank String name,
        @NotBlank String level,
        @NotBlank String letter,
        @Min(2020) int schoolYear,
        @NotBlank String scheduleType
) {
}
