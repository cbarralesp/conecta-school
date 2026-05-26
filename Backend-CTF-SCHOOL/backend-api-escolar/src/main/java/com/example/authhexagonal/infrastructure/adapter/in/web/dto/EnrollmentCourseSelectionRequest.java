package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.Size;

public record EnrollmentCourseSelectionRequest(
        @Size(max = 120) String baseName,
        @Size(max = 60) String level,
        @Size(max = 20) String letter,
        @Size(max = 10) String schoolYear,
        @Size(max = 40) String scheduleType
) {
}
