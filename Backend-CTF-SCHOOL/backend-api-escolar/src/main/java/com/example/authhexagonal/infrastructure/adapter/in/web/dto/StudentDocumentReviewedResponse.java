package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

public record StudentDocumentReviewedResponse(
        Long documentId,
        boolean reviewed,
        String message
) {
}
