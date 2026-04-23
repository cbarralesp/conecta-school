package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.ScheduleEntry;

public record ScheduleResponse(
        Long id,
        Long loadId,
        Long periodId,
        String periodName,
        Long courseId,
        String courseName,
        Long teacherId,
        String teacherCode,
        String teacherFullName,
        Long subjectId,
        String subjectCode,
        String subjectName,
        String subjectColorHex,
        Long blockId,
        String dayOfWeek,
        String startTime,
        String endTime,
        int order,
        String blockType,
        String room
) {
    public static ScheduleResponse fromDomain(ScheduleEntry entry) {
        return new ScheduleResponse(
                entry.id(),
                entry.loadId(),
                entry.periodId(),
                entry.periodName(),
                entry.courseId(),
                entry.courseName(),
                entry.teacherId(),
                entry.teacherCode(),
                entry.teacherFullName(),
                entry.subjectId(),
                entry.subjectCode(),
                entry.subjectName(),
                entry.subjectColorHex(),
                entry.blockId(),
                entry.dayOfWeek(),
                entry.startTime(),
                entry.endTime(),
                entry.order(),
                entry.blockType(),
                entry.room()
        );
    }
}
