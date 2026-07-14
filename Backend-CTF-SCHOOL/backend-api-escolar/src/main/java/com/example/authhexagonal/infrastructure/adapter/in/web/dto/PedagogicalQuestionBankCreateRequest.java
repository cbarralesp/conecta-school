package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;

public record PedagogicalQuestionBankCreateRequest(
        @NotBlank String areaKey,
        @NotBlank String levelCode,
        @NotBlank String questionKind,
        @NotBlank String questionText
) {
}
