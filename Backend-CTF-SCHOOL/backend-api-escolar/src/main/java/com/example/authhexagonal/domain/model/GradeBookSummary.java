package com.example.authhexagonal.domain.model;

public record GradeBookSummary(
        Double courseAverage,
        int aboveMinimumCount,
        int belowMinimumCount,
        int ungradedCount
) {
}
