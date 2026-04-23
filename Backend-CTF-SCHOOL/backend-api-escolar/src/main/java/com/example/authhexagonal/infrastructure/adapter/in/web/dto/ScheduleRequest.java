package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ScheduleRequest(
        @NotNull Long periodId,
        @NotNull Long courseId,
        @NotNull Long subjectId,
        @NotNull Long teacherId,
        @NotNull Long blockId,
        @Size(max = 30) String room
) {
}
