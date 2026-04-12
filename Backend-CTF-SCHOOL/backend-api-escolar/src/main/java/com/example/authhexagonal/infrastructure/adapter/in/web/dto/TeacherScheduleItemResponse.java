package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.TeacherScheduleItem;

public record TeacherScheduleItemResponse(
        String dayOfWeek,
        String startTime,
        String endTime,
        String courseName,
        String subjectName,
        String room
) {
    public static TeacherScheduleItemResponse fromDomain(TeacherScheduleItem item) {
        return new TeacherScheduleItemResponse(
                item.dayOfWeek(),
                item.startTime(),
                item.endTime(),
                item.courseName(),
                item.subjectName(),
                item.room()
        );
    }
}
