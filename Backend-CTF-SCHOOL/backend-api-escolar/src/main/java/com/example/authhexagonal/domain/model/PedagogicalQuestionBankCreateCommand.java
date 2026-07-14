package com.example.authhexagonal.domain.model;

public record PedagogicalQuestionBankCreateCommand(
        String areaKey,
        String levelCode,
        String questionKind,
        String questionText
) {
}
