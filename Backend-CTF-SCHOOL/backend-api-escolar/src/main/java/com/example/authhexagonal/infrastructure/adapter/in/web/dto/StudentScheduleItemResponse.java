package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.StudentScheduleItem;

public record StudentScheduleItemResponse(
        String dayOfWeek,
        String startTime,
        String endTime,
        String courseName,
        String subjectName,
        String room,
        String subjectColorHex
) {

    public static StudentScheduleItemResponse fromDomain(StudentScheduleItem item) {
        return new StudentScheduleItemResponse(
                item.dayOfWeek(),
                item.startTime(),
                item.endTime(),
                item.courseName(),
                item.subjectName(),
                item.room(),
                item.subjectColorHex()
        );
    }
}
