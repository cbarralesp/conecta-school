package com.example.authhexagonal.domain.model;

public record ScheduleBlock(
        Long id,
        String dayOfWeek,
        String startTime,
        String endTime,
        int order,
        String blockType
) {
}
