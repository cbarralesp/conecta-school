package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SubjectRequest(
        @NotBlank @Size(max = 30) String code,
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 120) String area,
        @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String colorHex,
        @Size(max = 500) String description,
        @Size(max = 80) String referenceLevel,
        @NotBlank @Pattern(regexp = "^(NUMERICA|CONCEPTUAL)$") String evaluationType,
        @Min(1) @Max(20) int suggestedHours,
        List<Long> teacherIds,
        List<Long> applicableGradeIds,
        List<Long> applicableCourseIds
) {
}
