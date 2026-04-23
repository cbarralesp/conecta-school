package com.example.authhexagonal.domain.model;

public record ScheduleEntry(
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
}
