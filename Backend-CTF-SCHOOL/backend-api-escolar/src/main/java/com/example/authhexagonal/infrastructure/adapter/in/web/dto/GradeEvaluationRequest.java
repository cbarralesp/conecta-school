package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record GradeEvaluationRequest(
        @NotNull Long courseId,
        @NotNull Long periodId,
        @NotNull Long subjectId,
        @NotBlank String code,
        @NotBlank String name,
        Double weight,
        LocalDate evaluationDate,
        @NotBlank String registrationType
) {
}
