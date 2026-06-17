package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotNull;

public record PedagogicalReportSaveRequest(
        @NotNull Long courseId,
        @NotNull Long periodId,
        @NotNull Long studentId,
        @NotNull PedagogicalReportContentRequest content
) {
}
