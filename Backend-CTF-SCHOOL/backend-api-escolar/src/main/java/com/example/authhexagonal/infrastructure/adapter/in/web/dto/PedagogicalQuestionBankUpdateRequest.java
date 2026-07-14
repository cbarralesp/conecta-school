package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;

public record PedagogicalQuestionBankUpdateRequest(
        @NotBlank String questionText
) {
}
