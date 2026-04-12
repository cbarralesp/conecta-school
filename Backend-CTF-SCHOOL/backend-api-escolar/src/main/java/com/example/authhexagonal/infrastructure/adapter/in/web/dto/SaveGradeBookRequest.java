package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SaveGradeBookRequest(
        @NotNull Long courseId,
        @NotNull Long periodId,
        @NotNull Long subjectId,
        List<GradeSaveEntryRequest> entries
) {
}
