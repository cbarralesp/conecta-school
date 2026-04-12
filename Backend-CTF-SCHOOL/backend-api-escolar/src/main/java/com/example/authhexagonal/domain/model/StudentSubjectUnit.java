package com.example.authhexagonal.domain.model;

import java.util.List;

public record StudentSubjectUnit(
        Long unitId,
        String unitNumber,
        String unitName,
        int totalClasses,
        int totalDocuments,
        int durationWeeks,
        int progressPercent,
        List<StudentSubjectClass> classes
) {
}
