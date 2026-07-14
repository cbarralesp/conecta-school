package com.example.authhexagonal.domain.model;

public record PedagogicalQuestionBankQuestion(
        Long id,
        String levelCode,
        String questionKind,
        String label,
        Integer sortOrder
) {
}
