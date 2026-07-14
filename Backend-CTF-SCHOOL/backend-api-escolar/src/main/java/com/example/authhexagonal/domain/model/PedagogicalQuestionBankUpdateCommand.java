package com.example.authhexagonal.domain.model;

public record PedagogicalQuestionBankUpdateCommand(
        Long questionId,
        String questionText
) {
}
