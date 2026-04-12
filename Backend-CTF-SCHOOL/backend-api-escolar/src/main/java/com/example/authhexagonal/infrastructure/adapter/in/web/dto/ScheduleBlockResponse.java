package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.ScheduleBlock;

public record ScheduleBlockResponse(
        Long id,
        String dayOfWeek,
        String startTime,
        String endTime,
        int order,
        String blockType
) {
    public static ScheduleBlockResponse fromDomain(ScheduleBlock block) {
        return new ScheduleBlockResponse(
                block.id(),
                block.dayOfWeek(),
                block.startTime(),
                block.endTime(),
                block.order(),
                block.blockType()
        );
    }
}
