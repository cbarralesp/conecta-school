package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EnrollmentDocumentRequest(
        @NotBlank @Size(max = 80) String documentKey,
        @NotBlank @Size(max = 255) String fileName
) {
}
