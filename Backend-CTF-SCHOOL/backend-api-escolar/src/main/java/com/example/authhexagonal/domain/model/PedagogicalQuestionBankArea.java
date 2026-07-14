package com.example.authhexagonal.domain.model;

import java.util.List;

public record PedagogicalQuestionBankArea(
        String key,
        String title,
        String levelCode,
        String questionKind,
        List<PedagogicalQuestionBankQuestion> questions
) {
}
