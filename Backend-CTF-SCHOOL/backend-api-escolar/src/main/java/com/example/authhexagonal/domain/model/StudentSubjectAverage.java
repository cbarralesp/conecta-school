package com.example.authhexagonal.domain.model;

public record StudentSubjectAverage(
        Long subjectId,
        String subjectName,
        String colorHex,
        Double average,
        String evaluationType,
        String conceptSummaryCode
) {
}
