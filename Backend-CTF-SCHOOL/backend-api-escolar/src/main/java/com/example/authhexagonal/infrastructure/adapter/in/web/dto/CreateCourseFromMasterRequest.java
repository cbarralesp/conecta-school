package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateCourseFromMasterRequest(
        @NotNull Long masterCourseId,
        @NotBlank String parallel,
        @Min(2020) int schoolYear,
        @NotBlank String scheduleType,
        @NotNull Long teacherId,
        Long assistantId,
        List<Long> studentIds
) {
}
