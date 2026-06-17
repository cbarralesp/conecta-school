package com.example.authhexagonal.domain.model;

public record PedagogicalQuestionBankRow(
        Long id,
        String areaKey,
        String levelCode,
        String questionKind,
        String questionText,
        Integer sortOrder
) {
}
