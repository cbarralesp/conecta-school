package com.example.authhexagonal.domain.model;

public record ActivityCalendarSummary(
        int total,
        int thisMonth,
        int upcoming,
        int completed
) {
}
