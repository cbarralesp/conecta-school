package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ScheduleBlockCreateRequest(
        Long courseId,
        @NotBlank
        @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$")
        String startTime,
        @NotBlank
        @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$")
        String endTime,
        @NotBlank
        @Pattern(regexp = "^(CLASE|RECREO)$")
        String blockType
) {
}
